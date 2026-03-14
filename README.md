### what is this and who is it for?
- this is a custom Google Home cloud-to-cloud bridge for Ecoforest fireplaces
- it lets you control a fireplace from the Google Home app and Google Assistant, which is useful if you prefer voice control or want a simpler mobile UI than the vendor app

### supported features
- power on / off
- set power level from 1 to 9
- toggle quiet / silence mode

### how to get access to this Google Home Action?
- go to `https://console.home.google.com/`
- log in with your google account
- open the `SmartStovePoC` project
- open the test area and start the latest available test version

### how to connect your Ecoforest device?
- install and open Google Home on your phone
- choose `Set up device`
- choose `Works with Google Home`
- find `[test] MyEco`
- complete the login form with your Ecoforest host, serial number, and password
- once the device is added, rename it to something natural like `Fireplace`

### useful voice commands

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

### privacy
- the device address, serial number, and password are passed through the Google account link flow and are not stored as plain user profile data in this repo
- device state cached in Firebase only stores normalized fireplace state for the linked account hash

### self-host
- requirements:
  - node `22`
  - npm
  - firebase cli
  - google cloud cli
- firebase project currently used by this repo: `smartstovepoc-123`

basic flow:
```text
firebase login --reauth
gcloud auth login
gcloud config set project smartstovepoc-123
firebase use smartstovepoc-123
cd functions
npm install
node test.js
firebase deploy --only functions
```

### notes
- the Ecoforest device API uses permissive TLS handling because the device endpoint does not present a cert chain Node accepts cleanly in practice
- query behavior is intentionally cache-first, with live status refresh happening in the background

### disclaimer
- this project has no affiliation with Ecoforest and is aimed at personal use
