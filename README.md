# Ecoforest Google Home Bridge

Control your Ecoforest fireplace from Google Home or Google Assistant. This
cloud-to-cloud bridge connects Google Home to the device's Ecoforest API, so
you can adjust the fire from the app or with your voice.

## Features

- Turn the fireplace on and off.
- Set its power level from 1 to 9.
- Toggle quiet mode.
- Report power as a brightness percentage, from 10% at level 1 to 90% at level 9.

Brightness is an indicator only: changing it does not change the stove's power.
Google Home's display and language support may vary.

## Connect Your Fireplace

The integration is currently available as a test. With access to the
`SmartStovePoC` project, open the test area in the
[Google Home Developer Console](https://console.home.google.com/) and start the
latest test version.

In the Google Home app:

1. Choose **Set up device**, then **Works with Google Home**.
2. Select **[test] MyEco**.
3. Enter your Ecoforest host and port, 11-digit serial number, and the first
   eight characters of the device password.
4. Rename the device if you like, for example to `Fireplace` or `Lareira`.

## Voice Commands

Try commands such as:

turn on / off
```text
(EN) Hey Google, turn on Fireplace
(EN) Hey Google, turn off Fireplace
(PT) Hey Google, ligar Lareira
(PT) Hey Google, desligar Lareira
```

set power level
```text
(EN) Hey Google, set Fireplace to level 5
(EN) Hey Google, set Fireplace power to 3
```

toggle quiet mode
```text
(EN) Hey Google, turn on silence mode on Fireplace
(EN) Hey Google, turn off silence mode on Fireplace
```

## Build And Deploy

You'll need Node.js 22, npm, make, the Firebase CLI, and access to a configured
Firebase project. From the repository root:

```sh
firebase login
make build
make deploy PROJECT=your-firebase-project-id
```

`make build` installs locked dependencies and runs the tests; `make test` runs
them using existing dependencies. Deployment includes Cloud Functions and
Realtime Database rules. **Deploying rules overwrites the live rules**, so
review `database.rules.json` before deploying.

Pull requests run tests, and pushes to `main` deploy to the configured project.
See [deployment infrastructure](infra/github-deploy/README.md) for Terraform
and GitHub Actions setup.

## Notes

- Firebase caches normalized device state; queries return cached state while a
  live refresh runs in the background.
- The device API uses permissive TLS handling because the device endpoint's
  certificate chain is not accepted by Node.js. This weakens connection security.
- Device connection details are carried in the Google account-linking tokens;
  treat those tokens as credentials.

This is an independent personal project and is not affiliated with Ecoforest.
