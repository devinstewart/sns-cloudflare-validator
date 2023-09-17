# Contributing
First of all, thanks for your interest in contributing to this project.

I am open to contributions, and I will be happy to accept any pull request that meets the needs of this module.  You can also open an issue, and I will be happy to help you out, or even add a new feature.

### Why does this project exist?
While maintining [sns-payload-validator](https://www.npmjs.com/package/sns-payload-validator), I was asked on a few occasions if the module could support Cloudflare's worker platform.  Due to Cloudflare not including `crypto` in their worker platform, I was unable to support it.

So I decided to create a new module that used the WebCrypto API, which is supported by Cloudflare workers.
mostly use it for the Intellisense).

### Coding Style
I have adapted the coding style guide of [hapijs](https://hapi.dev/policies/styleguide/), as I do work with the fine folks in that project.

### Dependencies
As a DevSecOps engineer, I love modules without a lot of dependencies.  If there is a feature that you would like to add that requires a dependency, please open an issue.  We will come to one of three decisions:
- We add the dependency.
- We include the funtionality needed in the module.
- We create a separate module maintained here that includes the functionality needed.

This module only has a dependency on [lru-cache](https://www.npmjs.com/package/lru-cache) to cache the certificate keys from AWS.  This is a perfect example of using an external dependency, as lru-cache is a long proven and well maintained module.  There is no reason for us to recreate the wheel of caching.

By contrast, I have adapted code from [node-forge](https://www.npmjs.com/package/node-forge) to extract the public key from the x509 certificate.  I did this because node-forge has a lot of functionality, making it large, and I only needed a small portion of the module to complete this task.  So I adapted the code to fit my needs keeping the module small.

### Conclusion
I hope that this module is useful to you, and I hope that you will contribute to the project. -- Devin Stewart