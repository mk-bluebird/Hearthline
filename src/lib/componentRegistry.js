const HearthlineComponent = Object.freeze({
  ANCHOR_LINE: 'ANCHOR_LINE',
  COMMON_GROUND: 'COMMON_GROUND',
  HEARTH_CHAT: 'HEARTH_CHAT',
  STEADY_PATH: 'STEADY_PATH',
  TRUE_COMPASS: 'TRUE_COMPASS',
  LANTERN: 'LANTERN',
  MEMORY_AID: 'MEMORY_AID',
  AFTERLIGHT: 'AFTERLIGHT',
  WAYPOINT: 'WAYPOINT',
  IDENTITY_CONTINUITY: 'IDENTITY_CONTINUITY',
  RECOVERY_EXPRESSION: 'RECOVERY_EXPRESSION',
  RECIPIENT_PERSONA: 'RECIPIENT_PERSONA'
});

const ALLOWED_READS = Object.freeze({
  [HearthlineComponent.ANCHOR_LINE]: Object.freeze([HearthlineComponent.IDENTITY_CONTINUITY]),
  [HearthlineComponent.COMMON_GROUND]: Object.freeze([HearthlineComponent.IDENTITY_CONTINUITY]),
  [HearthlineComponent.HEARTH_CHAT]: Object.freeze([HearthlineComponent.COMMON_GROUND, HearthlineComponent.STEADY_PATH]),
  [HearthlineComponent.STEADY_PATH]: Object.freeze([HearthlineComponent.IDENTITY_CONTINUITY]),
  [HearthlineComponent.TRUE_COMPASS]: Object.freeze([HearthlineComponent.COMMON_GROUND, HearthlineComponent.STEADY_PATH]),
  [HearthlineComponent.LANTERN]: Object.freeze([HearthlineComponent.ANCHOR_LINE]),
  [HearthlineComponent.MEMORY_AID]: Object.freeze([HearthlineComponent.ANCHOR_LINE, HearthlineComponent.STEADY_PATH]),
  [HearthlineComponent.AFTERLIGHT]: Object.freeze([]),
  [HearthlineComponent.WAYPOINT]: Object.freeze([HearthlineComponent.COMMON_GROUND, HearthlineComponent.STEADY_PATH]),
  [HearthlineComponent.IDENTITY_CONTINUITY]: Object.freeze([]),
  [HearthlineComponent.RECOVERY_EXPRESSION]: Object.freeze([HearthlineComponent.COMMON_GROUND]),
  [HearthlineComponent.RECIPIENT_PERSONA]: Object.freeze([HearthlineComponent.COMMON_GROUND, HearthlineComponent.IDENTITY_CONTINUITY])
});

const COMPONENT_NAMES = Object.freeze(Object.values(HearthlineComponent));

function isReadAllowed(source, target) {
  if (!COMPONENT_NAMES.includes(source)) {
    throw new TypeError(`Unknown component: ${source}`);
  }
  if (!COMPONENT_NAMES.includes(target)) {
    throw new TypeError(`Unknown component: ${target}`);
  }
  const allowed = ALLOWED_READS[source];
  return allowed.includes(target);
}

function assertReadAllowed(source, target) {
  if (!isReadAllowed(source, target)) {
    throw new Error(`Read not allowed: ${source} cannot read ${target}`);
  }
}

function listAllowedReads(source) {
  if (!COMPONENT_NAMES.includes(source)) {
    throw new TypeError(`Unknown component: ${source}`);
  }
  return [...ALLOWED_READS[source]];
}

function listForbiddenReads() {
  const forbidden = [];
  for (const source of COMPONENT_NAMES) {
    for (const target of COMPONENT_NAMES) {
      if (source !== target && !ALLOWED_READS[source].includes(target)) {
        forbidden.push({ source, target });
      }
    }
  }
  return Object.freeze(forbidden);
}

function validateComponentRegistry() {
  const errors = [];
  for (const component of COMPONENT_NAMES) {
    if (!ALLOWED_READS.hasOwnProperty(component)) {
      errors.push(`Missing allowed reads definition for ${component}`);
    }
  }
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  return { valid: true, errors: [] };
}

function assertValidComponentRegistry() {
  const result = validateComponentRegistry();
  if (!result.valid) {
    throw new Error(`Component registry validation failed: ${result.errors.join('; ')}`);
  }
}

export {
  HearthlineComponent,
  isReadAllowed,
  assertReadAllowed,
  listAllowedReads,
  listForbiddenReads,
  validateComponentRegistry,
  assertValidComponentRegistry
};
