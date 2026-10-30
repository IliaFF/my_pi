# Spec Delta

## REMOVED Requirements

### Requirement: Adoption pins both components
**Reason**: Captain removed the default Pi plugin and approved reproducing the current stack without reinstalling it.
**Migration**: Remove only default pi-herdr-agents declarations/lock/patch activation; preserve standalone Herdr, Firstmate backend support and saved data.

## ADDED Requirements

### Requirement: Retired Pi plugin is not reinstalled
Default installation MUST omit pi-herdr-agents and its permanent routing paragraph. Removing this default MUST NOT delete standalone Herdr, Firstmate code, agent state or personal configuration.

#### Scenario: Fresh stack installation
- **WHEN** the approved source is installed
- **THEN** workspace history is available without the retired Pi plugin and Firstmate can still use its separate Herdr backend
