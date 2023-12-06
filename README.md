# README

This repository contains my take on hacking a [friend.tech](https://docs.hiro.so/hacks/build-a-friend-tech-clone) clone. I wasn't familiar with friend.tech before, so I'm not sure if the project went on the write direction. Code looks horrible, but features seem to work ok.

The idea here is to create smart-contract-enabled chat rooms, where only key holders can interact.

The smart contract was deployed to testnet (https://explorer.hiro.so/txid/ST203SGZM0XR3P4YSVD2XVMF1N63CRG2DRXT4C7AE.keys?chain=testnet), and it's address is hard-coded everywhere.

## How to run

Install dependencies:

`yarn install`

Start the server:

`node server.js`

Start the app: `yarn build && yarn serve`

The project will be running on [localhost:3000](http://localhost:3000)

## How it works

Visit the main page and connect your wallet in testnet mode. Next, select the room you want to connect to. To join the room, you'll need to be a holder of the room's key, and you can check if you are on the find room pop-up. In case you're not, you can trigger a buy-key transaction from the UI itself.

When in the room, you also have the option to sell your keys.

There's some very basic checks in place for allowing a user to connect to a room. The server will give the user a message (should be a random one in production) and require them to sign it as a proof of identity. The server also checks if the user is a holder of the key for the room they're trying to join.

To be able to buy a key, the subject must have started a supply themselves. There's supply initiated for the address ST203SGZM0XR3P4YSVD2XVMF1N63CRG2DRXT4C7AE
