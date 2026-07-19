import { describe, it, expect } from 'vitest';
import {
  scanCostBearingLiterals,
  buildVersionPinNote,
  AWS_REGIONS,
  GCP_REGIONS,
  EC2_INSTANCE_FAMILIES,
  GCP_MACHINE_FAMILIES,
  PROVIDER_VERSIONS,
  LAST_VERIFIED,
} from '@/lib/iac-allowlists';

describe('scanCostBearingLiterals — AWS regions', () => {
  it('flags a fabricated AWS region', () => {
    const notes = scanCostBearingLiterals('provider "aws" { region = "us-east-3" }');
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain('us-east-3');
  });

  it('does not flag a real AWS region', () => {
    expect(scanCostBearingLiterals('region = "eu-west-2"')).toEqual([]);
  });

  it('recognizes GovCloud regions', () => {
    expect(scanCostBearingLiterals('region = "us-gov-west-1"')).toEqual([]);
  });

  it('lists multiple bad regions once each', () => {
    const notes = scanCostBearingLiterals('a="us-east-3" b="us-east-3" c="eu-west-9"');
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain('us-east-3');
    expect(notes[0]).toContain('eu-west-9');
    // deduplicated
    expect(notes[0].match(/us-east-3/g)).toHaveLength(1);
  });
});

describe('scanCostBearingLiterals — GCP regions', () => {
  it('flags a fabricated GCP region', () => {
    const notes = scanCostBearingLiterals('region = "us-central9"');
    expect(notes.some(n => n.includes('us-central9'))).toBe(true);
  });

  it('does not flag a real GCP region', () => {
    expect(scanCostBearingLiterals('region = "europe-west4"')).toEqual([]);
  });
});

describe('scanCostBearingLiterals — EC2 instance families', () => {
  it('flags an unknown EC2 family', () => {
    const notes = scanCostBearingLiterals('instance_type = "m9id.large"');
    expect(notes.some(n => n.includes('m9id'))).toBe(true);
  });

  it('does not flag known EC2 families across sizes', () => {
    expect(scanCostBearingLiterals('a="t3.micro" b="m6i.2xlarge" c="c7g.metal" d="r6g.medium"')).toEqual([]);
  });

  it('does not flag i3en.24xlarge', () => {
    expect(scanCostBearingLiterals('instance_type = "i3en.24xlarge"')).toEqual([]);
  });
});

describe('scanCostBearingLiterals — GCP machine families', () => {
  it('flags an unknown GCP machine family', () => {
    const notes = scanCostBearingLiterals('machine_type = "z9-standard-4"');
    expect(notes.some(n => n.includes('z9'))).toBe(true);
  });

  it('does not flag a known GCP machine type', () => {
    expect(scanCostBearingLiterals('machine_type = "e2-standard-4"')).toEqual([]);
  });
});

describe('scanCostBearingLiterals — Terraform provider versions', () => {
  it('flags a provider major ahead of what exists', () => {
    const script = 'required_providers { aws = { source = "hashicorp/aws", version = "~> 9.0" } }';
    const notes = scanCostBearingLiterals(script);
    expect(notes.some(n => n.includes('aws') && n.includes('9'))).toBe(true);
  });

  it('does not flag a current or older provider major', () => {
    const current = 'aws = { source = "hashicorp/aws", version = "~> 6.0" }';
    const older = 'aws = { source = "hashicorp/aws", version = "~> 5.0" }';
    expect(scanCostBearingLiterals(current)).toEqual([]);
    expect(scanCostBearingLiterals(older)).toEqual([]);
  });

  it('handles a compound constraint by its highest major', () => {
    const script = 'azurerm = { source = "hashicorp/azurerm", version = ">= 4.0, < 5.0" }';
    expect(scanCostBearingLiterals(script)).toEqual([]);
  });

  it('flags azurerm and google independently', () => {
    const script =
      'azurerm = { source = "hashicorp/azurerm", version = "~> 8.0" }\n' +
      'google = { source = "hashicorp/google", version = "~> 12.0" }';
    const notes = scanCostBearingLiterals(script);
    expect(notes.some(n => n.includes('azurerm'))).toBe(true);
    expect(notes.some(n => n.includes('google'))).toBe(true);
  });
});

describe('scanCostBearingLiterals — clean input and safety', () => {
  it('returns no notes for a plain PowerShell script', () => {
    const ps = '#Requires -Version 5.1\nSet-StrictMode -Version Latest\nGet-ADUser -Filter *';
    expect(scanCostBearingLiterals(ps)).toEqual([]);
  });

  it('returns no notes for an empty script', () => {
    expect(scanCostBearingLiterals('')).toEqual([]);
  });

  it('does not treat ordinary hyphenated words as regions', () => {
    expect(scanCostBearingLiterals('this is a well-written multi-line note about state')).toEqual([]);
  });
});

describe('buildVersionPinNote (L2 prompt grounding)', () => {
  it('emits pinned versions for terraform', () => {
    const note = buildVersionPinNote('terraform');
    expect(note).toContain('PINNED VERSIONS');
    expect(note).toContain(LAST_VERIFIED);
    expect(note).toContain('hashicorp/aws');
    expect(note).toContain(PROVIDER_VERSIONS.aws.recommended);
    expect(note).toContain(PROVIDER_VERSIONS.terraform.recommended);
  });

  it('does not list terraform core as a provider line', () => {
    const note = buildVersionPinNote('terraform');
    expect(note).not.toContain('null:');
  });

  it('returns empty string for non-terraform tools', () => {
    expect(buildVersionPinNote('powershell')).toBe('');
    expect(buildVersionPinNote('bash')).toBe('');
    expect(buildVersionPinNote(undefined)).toBe('');
    expect(buildVersionPinNote('ansible')).toBe('');
  });
});

describe('allowlist manifest integrity', () => {
  it('is date-stamped', () => {
    expect(LAST_VERIFIED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('has non-trivial region and family sets', () => {
    expect(AWS_REGIONS.size).toBeGreaterThan(20);
    expect(GCP_REGIONS.size).toBeGreaterThan(20);
    expect(EC2_INSTANCE_FAMILIES.size).toBeGreaterThan(30);
    expect(GCP_MACHINE_FAMILIES.size).toBeGreaterThan(10);
  });

  it('pins the four grounded providers with plausible majors', () => {
    expect(Object.keys(PROVIDER_VERSIONS)).toEqual(['terraform', 'aws', 'azurerm', 'google']);
    for (const pin of Object.values(PROVIDER_VERSIONS)) {
      expect(pin.latestMajor).toBeGreaterThan(0);
      expect(pin.recommended).toMatch(/\d/);
    }
  });
});
