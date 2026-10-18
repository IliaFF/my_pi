# Why
A background job timeout delivered a terminal notice but did not resume the agent. The user requests automatic completion handling by default instead of per-job opt-in.

# What Changes
Make ordinary bg_run and /bg terminal completion wake the agent by default. Preserve explicit triggerOnCompletion:false and notifyOnCompletion:false opt-outs, boolean validation, shutdown suppression and existing safety/lifecycle limits. EventBus keeps its explicit boolean contract.

# Capabilities
- Modified: background-shell-pilot
- Modified: build-validation

# Impact
Version-gated background package patch, real SDK lifecycle regression, README and specs. No production installation or external model calls. Automatic turns consume model quota; wake is not permission for retries/deployment/paid operations.
