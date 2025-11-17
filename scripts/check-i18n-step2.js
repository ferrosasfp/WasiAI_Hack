#!/usr/bin/env node
/* Quick i18n key existence check for Step 2 (Customer sheet + Technical configuration) in en/es
   Run: node scripts/check-i18n-step2.js
*/
const path = require('path');
const fs = require('fs');

const en = require(path.resolve(__dirname, '../src/messages/en.json'));
const es = require(path.resolve(__dirname, '../src/messages/es.json'));

const CS_BASE = 'wizard.step2.clientSheetMicrocopy';
const CLIENT_SHEET_KEYS = [
  `${CS_BASE}.intro`,
  `${CS_BASE}.headers.valuePropLabel`,
  `${CS_BASE}.headers.valuePropPh`,
  `${CS_BASE}.headers.descriptionLabel`,
  `${CS_BASE}.headers.descriptionPh`,
  `${CS_BASE}.headers.expectedImpactLabel`,
  `${CS_BASE}.headers.expectedImpactPh`,
  `${CS_BASE}.context.industriesLabel`,
  `${CS_BASE}.context.industriesPh`,
  `${CS_BASE}.context.useCasesLabel`,
  `${CS_BASE}.context.useCasesPh`,
  `${CS_BASE}.context.supportedLangsLabel`,
  `${CS_BASE}.context.supportedLangsPh`,
  `${CS_BASE}.io.title`,
  `${CS_BASE}.io.helper`,
  `${CS_BASE}.io.inputsLabel`,
  `${CS_BASE}.io.inputsPh`,
  `${CS_BASE}.io.outputsLabel`,
  `${CS_BASE}.io.outputsPh`,
  `${CS_BASE}.examples.inputLabel`,
  `${CS_BASE}.examples.inputPh`,
  `${CS_BASE}.examples.outputLabel`,
  `${CS_BASE}.examples.outputPh`,
  `${CS_BASE}.examples.noteLabel`,
  `${CS_BASE}.examples.notePh`,
  `${CS_BASE}.risks.label`,
  `${CS_BASE}.risks.ph`,
  `${CS_BASE}.prohibited.label`,
  `${CS_BASE}.prohibited.ph`,
  `${CS_BASE}.privacy.label`,
  `${CS_BASE}.privacy.ph`,
  `${CS_BASE}.deploy.label`,
  `${CS_BASE}.deploy.ph`,
  `${CS_BASE}.support.label`,
  `${CS_BASE}.support.ph`,
];

// Step 2 general keys used in the page
const STEP2_MISC = [
  'wizard.step2.title',
  'wizard.step2.subtitle',
  'wizard.step2.clientSheet.title',
  'wizard.step2.clientSheet.help',
  'wizard.step2.clearSheet',
  'wizard.step2.cleared',
  'wizard.step2.presetApplied',
  'wizard.step2.validationFillClientSheet',
  'wizard.step2.examples.add',
  'wizard.step2.examples.remove',
  'wizard.step2.preview.title',
  'wizard.step2.preview.help',
  'wizard.step2.preview.inputs',
  'wizard.step2.preview.outputs',
  'wizard.step2.preview.examples',
];

// Technical configuration keys
const TECH_BASE = 'wizard.step2.tech';
const TECH_KEYS = [
  `${TECH_BASE}.accordionTitle`,
  `${TECH_BASE}.titles.capabilities`,
  `${TECH_BASE}.titles.architecture`,
  `${TECH_BASE}.titles.runtime`,
  `${TECH_BASE}.titles.dependencies`,
  `${TECH_BASE}.titles.resources`,
  `${TECH_BASE}.titles.inference`,
  `${TECH_BASE}.helps.capabilities`,
  `${TECH_BASE}.helps.architecture`,
  `${TECH_BASE}.helps.runtime`,
  `${TECH_BASE}.helps.dependencies`,
  `${TECH_BASE}.helps.resources`,
  `${TECH_BASE}.helps.inference`,
  `${TECH_BASE}.labels.tasks`,
  `${TECH_BASE}.labels.modalities`,
  `${TECH_BASE}.labels.frameworks`,
  `${TECH_BASE}.labels.architectures`,
  `${TECH_BASE}.labels.precision`,
  `${TECH_BASE}.labels.quantization`,
  `${TECH_BASE}.labels.modelParams`,
  `${TECH_BASE}.labels.fileFormats`,
  `${TECH_BASE}.labels.python`,
  `${TECH_BASE}.labels.cuda`,
  `${TECH_BASE}.labels.torch`,
  `${TECH_BASE}.labels.cudnn`,
  `${TECH_BASE}.labels.systems`,
  `${TECH_BASE}.labels.accelerators`,
  `${TECH_BASE}.labels.computeCapability`,
  `${TECH_BASE}.labels.vramGB`,
  `${TECH_BASE}.labels.cpuCores`,
  `${TECH_BASE}.labels.ramGB`,
  `${TECH_BASE}.labels.maxBatch`,
  `${TECH_BASE}.labels.contextLen`,
  `${TECH_BASE}.labels.maxTokens`,
  `${TECH_BASE}.labels.imagePx`,
  `${TECH_BASE}.labels.sampleRate`,
  `${TECH_BASE}.labels.triton`,
  `${TECH_BASE}.placeholders.select`,
  `${TECH_BASE}.placeholders.precision`,
  `${TECH_BASE}.placeholders.imagePx`,
  `${TECH_BASE}.placeholders.cuda`,
  `${TECH_BASE}.placeholders.torch`,
  `${TECH_BASE}.placeholders.compute`,
  `${TECH_BASE}.placeholders.packages`,
];

// Common labels used in Step 2 footer/messages
const COMMON_KEYS = [
  'wizard.common.back',
  'wizard.common.next',
  'wizard.common.saveDraft',
  'wizard.common.saving',
  'wizard.common.saved',
  'wizard.common.errorSaving',
  'wizard.common.publish',
  'wizard.common.publishing',
];

const STEP2_KEYS = [
  ...CLIENT_SHEET_KEYS,
  ...STEP2_MISC,
  ...TECH_KEYS,
  ...COMMON_KEYS,
];

function getByPath(obj, dotPath) {
  return dotPath.split('.').reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj);
}

function check(localeName, obj) {
  const missing = [];
  for (const key of STEP2_KEYS) {
    if (getByPath(obj, key) === undefined) {
      missing.push(key);
    }
  }
  return missing;
}

const missingEn = check('en', en);
const missingEs = check('es', es);

let ok = true;
if (missingEn.length) {
  ok = false;
  console.error('[en] Missing i18n keys for Step 2:');
  for (const k of missingEn) console.error(' -', k);
}
if (missingEs.length) {
  ok = false;
  console.error('[es] Missing i18n keys for Step 2:');
  for (const k of missingEs) console.error(' -', k);
}

if (ok) {
  console.log('All Step 2 i18n keys present in en and es.');
  process.exit(0);
} else {
  process.exit(1);
}
