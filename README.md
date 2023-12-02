### what is this and who is it for?
- this is a custom Google Action compatible with Ecoforest devices. you can control your Ecoforest equipment using Google Assistant voice commands on your smartphone or Nest smartspeaker. you can also manage the device in the Google Home app
- aimed for home-automation fans or for people that are unable to use the smartphone app or the device built-in screen and controls

### how to get access to this Google Home Action?
- raise your hand if you want to try this (i need to send you an invite)
- go to https://console.actions.google.com/
- log in with your google account
- choose "SmartStovePoC"
- accept the disclamer thing
- click "Test" on the top menu
- click "Start testing"
- when prompted, choose the latest release available
![Dec-11-2022 16-42-38](https://user-images.githubusercontent.com/3460078/206916732-f0176c9d-1cc8-45bf-b77b-adef87b6bd41.gif)

### how to connect your Ecoforest device?
- install and open Google Home from the app store on your phone
- choose "Set up device"
- choose "Works with Google"
- find "[test] MyEco"
- go through the login page
- once the device is added, change it's name to something you like (ie.: Fireplace)

https://user-images.githubusercontent.com/3460078/206921937-69199d0f-811c-4d3c-8afc-6caae8c49f44.mp4


all done!

you can now power on/off your Ecoforest device using Google Home app and Google Assistant voice commands.

### usefull voice commands

turn on / off immediatly
```
   (EN) Hey Google, turn on/off Fireplace
   (PT) Hey Google, ligar/desligar Lareira
```

create a schedule
```
   (EN) Hey Google, turn on/off Fireplace at 7
   (PT) Hey Google, ligar/desligar a Lareira às 7
```

remove a schedule; device or all:
```
   (EN) Hey Google, remove Fireplace schedule
   (PT) Hey Google, remover agendamento de Lareira

   (EN) Hey Google, cancel all my scheduled actions
   (PT) Hey Google, remover acçoes agendadas
```

### privacy
No sensitive device information (address, serial number, password) is stored or disclosed.

### self-host
you can also run your own instance of this custom Google Action. you will need a `Google Cloud Platform` account, `node`, `npm` and the `firebase` CLI.
follow the great step by step documentation from Google on https://developers.home.google.com/codelabs/smarthome-washer for all the details.  
