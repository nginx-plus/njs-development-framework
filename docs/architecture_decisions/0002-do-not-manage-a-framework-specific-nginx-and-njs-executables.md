# 2. Do not manage a framework-specific nginx and njs executables

Date: 2022-06-14

## Status

Accepted

## Context

When development was first started, we thought that taking away the task of installing an appropriate version of
`nginx` and the `njs` command line tool would be desireable as it would lower the barrier to "just getting something working".

However, after more thought and further development, we see these shortcomings:
1. Installation of nginx from source is tricky to get right across many systems, and may not be the preferred method for many
1. It is important for the `nginx` and `njs` installs to be as close as possible to the target environment. It would be difficult to provide a managed interface to configure these components that would be right for everyone.
1. Part of the goal of this framwork is to teach its users core nginx concepts.  Hiding the installation and configuration of nginx is not in line with that goal.

## Decision

The decision has three main parts:

1. The framework assumes that `nginx` and `njs` in the `PATH` should be used to run integration and unit tests respectively.

1. We will address potential issues installing `nginx` and `njs` through documentation rather than install scripts.

1. Usage of the docker-based flow will be encouraged

## Consequences

This free us from having to maintain setup for `nginx` and `njs` across many platforms.  It will also allow users of the framework
to have more complete control over their nginx configuration.

Downsides to this are:
1. Getting up and running might be slightly less smooth if you choose not you use docker
1. There is currently no mechanism to ensure that local `nginx` and `njs` config is exactly the same as ci or production.

For (2) we leave that for future iterations.