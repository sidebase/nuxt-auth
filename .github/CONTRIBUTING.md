# Contributing guide

Thank you to everyone who has contributed to this project by writing issues or opening pull requests. Your efforts help us improve and grow. We appreciate your support and look forward to your contributions!

Please see the GitHub [Code of Conduct](https://docs.github.com/en/site-policy/github-terms/github-community-guidelines) and follow any templates configured in GitHub when reporting bugs, requesting enhancements, or contributing code.

If you would like to report a security vulnerability, please DO NOT post an issue but instead follow our [Security reporting guide](/SECURITY.md).

## Bug reports

A bug is a reproducible issue caused by the package. Reporting bugs is very helpful and allows us to address problems efficiently!

### Before opening an issue

Before opening a [new bug report](https://github.com/sidebase/nuxt-auth/issues/new?assignees=&labels=bug%2Cpending&projects=&template=bug-report.yaml), please:

- **Search for other issues relating to this bug** using the Github Issue search
- **Check if the issue may have already been patched** in a newer version or inside the `main` branch
- **Isolate the issue** and create a reproduction

Please refer to the fantastic Nuxt [bug report guidelines here](https://nuxt.com/docs/community/reporting-bugs) for more details on efficiently describing bugs.

### Opening an issue

To report a bug, please [open an issue](https://github.com/sidebase/nuxt-auth/issues/new?assignees=&labels=bug%2Cpending&projects=&template=bug-report.yaml) based on our Bug Reporting template. The template will prompt you with questions that will increase our ability to scope and address the bug.

## Feature requests

Feature requests are divided into two types:

- **Enhancements**: Improve or extend an existing feature of the package
- **Feature request**: Add a new feature to the package

Both types can be created using our [Enchantment issue template](https://github.com/sidebase/nuxt-auth/issues/new?assignees=&labels=pending%2Cenhancement&projects=&template=enhancement.yml).

Before posting an enchantment, please consider the following questions:

- What problem does this enhancement fix?
- How would you recommend implementing this enhancement?
- How would this enhancement change the entire package?
  - Would it require a major, minor, or patch release?
  - Which providers would be impacted by this change?

> [!IMPORTANT]
> The more impact your Enchantment has on the package, the longer it may take to push, as we need to integrate it into our release cycle.

> [!IMPORTANT]
> While we appreciate every request, we cannot accept them all. Please be understanding if we do not accept your request.

## Pull requests

Thank you to everyone who plans to open a pull request on our package! We appreciate your hard work and motivation to help us improve!

Before opening a pull request, please open a corresponding issue outlining the bug or enhancement you are adding. If you plan to implement a more significant change to the code base, please discuss this with us in an issue before beginning your work. This is to avoid the risk of you spending a lot of time working on a contribution we may disagree with.

### Your first contribution

To start developing on this package, please follow the quick start guide below.

1. [Fork](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/fork-a-repo) the project to your own personal GitHub
1. Setup a local fork of the project:
   ```sh
   # Clone the fork
   git clone https://github.com/<username>/<fork-repo-name>
   # Navigate to the directory
   cd <fork-repo-name>
   # Assign the original repo to a remote called "upstream"
   git remote add upstream https://github.com/sidebase/nuxt-auth
   # If you cloned a while ago, checkout the main branch and re-pull the latest changes
   git checkout main
   git pull
   ```
2. Set up the correct ppm version, using [Corepack](https://nodejs.org/api/corepack.html) and install the dependencies
   ```sh
   corepack enable ppm
   ppm install
   ```
4. Create a new branch (based on the `main` branch):
   ```sh
   git checkout -b <fix/enh/docs>/<issue_number>-<description>
   ```
5. Update the code to include your fix or Enchantment
6. Add or update any tests that relate to your changes.
7. Ensure that the `tests,` `lint,` and `prepack` all pass
   ```sh
   ppm prepack
   ppm lint
   ppm type check

   # Test any provider that you have modified
   cd playground-<provider>
   ppm build
   ppm test:e2e
   ```
8. [Open a Pull Request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests), and fill out the provided fields.

> [!TIP]
> Read more about how to use the included playground [here](../README.md#development).

> [!IMPORTANT]
> By submitting a Pull request, you agree to license your work under the MIT license used by the project.

### Reviews

After you submit your Pull request, a member of our core team will review it. Please be patient with this process, as it can take up to 14 weeks, depending on the team's availability.

After receiving a review, please address any comments left by the reviewer or debate them if you disagree. This process will repeat until the pull request is approved and merged!

> [!NOTE]
> Besides a manual review of your pull request, we will run an automated CI pipeline on your code.

## Release cycles

This package follows [Semantic Versioning 2.0.0](https://semver.org/).

- **MAJOR** version when you make incompatible API changes
- **MINOR** version when you add functionality in a backward-compatible manner
- **PATCH** version when you make backward compatible bug fixes

If we release a pre-version of a new release, we will tag it with `next` in the npmjs release and add one of the following additions to the versions:

- **ALPHA**: Early development build of a new release
  - Not properly tested yet
- **RC**: Potential release candidate of a new release
  - Internally tested on a series of demo apps
  - We will begin to integrate the new version into our production apps as a final test

## Additional Questions

If you have any questions or would like to get in contact with us directly, feel free to [join our Discord server](https://discord.gg/NDDgQkcv3s)!
