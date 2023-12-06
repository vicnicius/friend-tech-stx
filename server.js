const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const cors = require('cors');
const { Server } = require('socket.io');
const { verifyMessageSignatureRsv } = require('@stacks/encryption');

const {
  callReadOnlyFunction,
  getAddressFromPublicKey,
  standardPrincipalCV,
  cvToValue
} = require('@stacks/transactions');
const { StacksTestnet } = require('@stacks/network');

const io = new Server(server, { cors: { origin: '*' } });
const challengeMessage = 'Hiro Hacks Fun 2023';
const network = new StacksTestnet();

const verifyIsHolder = async (subject, holder) => {
  const contractAddress = 'ST203SGZM0XR3P4YSVD2XVMF1N63CRG2DRXT4C7AE';
  const contractName = 'keys';
  const functionName = 'is-keyholder';

  const functionArgs = [
    standardPrincipalCV(subject),
    standardPrincipalCV(holder)
  ];

  const response = await callReadOnlyFunction({
    network,
    contractAddress,
    contractName,
    functionName,
    functionArgs,
    senderAddress: holder
  });
  return cvToValue(response);
};

app.use(cors());

io.on('connection', async (socket) => {
  const {
    'public-key': publicKey,
    signature,
    subject
  } = socket.request.headers;
  const verified = verifyMessageSignatureRsv({
    message: challengeMessage,
    publicKey,
    signature
  });
  const holder = getAddressFromPublicKey(publicKey, network.version);
  const isHolder = await verifyIsHolder(subject, holder);
  console.log({ verified, subject, holder, isHolder });
  if (!verified || !subject || !isHolder) {
    socket.disconnect(true);
    return;
  }
  socket.join(subject);
  socket.on('disconnect', (data) => {
    console.log('user disconnected', data);
  });
  socket.on('message', (message) => {
    console.log('message', message, holder);
    io.to(subject).emit('message-broadcast', { message, holder });
  });
});

io.on('error', (err) => {
  console.log('SocketIO Error: ', err);
});

app.get('/challenge', (req, res) => {
  return res.status(200).send(challengeMessage);
});

server.listen(3010, () => {
  console.log('listening on *:3010');
});
