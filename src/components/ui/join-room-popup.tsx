import * as Dialog from '@radix-ui/react-dialog';
import { MouseEventHandler, useState } from 'react';
import { Button } from './button';
import { X } from 'lucide-react';
import {
  callReadOnlyFunction,
  cvToValue,
  principalCV,
  uintCV
} from '@stacks/transactions';
import { StacksTestnet } from '@stacks/network';

const Result = ({ status }: { status: string }) => {
  return (
    <div className="mt-4 border-t border-slate-300 border-dashed w-full py-2 italic">
      {status}
    </div>
  );
};
const network = new StacksTestnet();

const checkIfIsHolder = async (
  holder: string,
  subject: string,
  senderAddress: string
) => {
  console.log({ holder, subject, senderAddress });
  const contractAddress = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  const contractName = 'keys-v1';
  const functionName = 'is-key-holder';

  const functionArgs = [principalCV(subject), principalCV(holder)];

  const result = await callReadOnlyFunction({
    network,
    contractAddress,
    contractName,
    functionName,
    functionArgs,
    senderAddress
  });

  return cvToValue(result);
};

export const JoinRoomPopup = ({ address }: { address: string }) => {
  const [open, setOpen] = useState(false);
  const [destinationAddress, setDestinationAddress] = useState('');
  const [roomStatus, setRoomStatus] = useState('');
  const checkAccess: MouseEventHandler = (event) => {
    event.preventDefault();
    if (destinationAddress.length === 0) {
      setRoomStatus('Please enter a valid destination address.');
      return;
    }
    setRoomStatus('Checking...');
    checkIfIsHolder(address, destinationAddress, address)
      .then((result) => {
        console.log(result);
      })
      .catch((error) => {
        console.error(error);
        setRoomStatus(`Sorry, we couldn't verify the room status this time.`);
      });
  };
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
        Join Room
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="w-full h-full bg-slate-900 bg-opacity-90 fixed inset-0" />
        <Dialog.Content className="fixed flex w-full h-full items-center justify-center inset-0">
          <div className="bg-slate-50 flex w-full max-w-xl h-full max-h-96 rounded-lg flex-col p-8 relative">
            <Dialog.Title className="text-3xl">Join Room</Dialog.Title>
            <Button
              onClick={() => setOpen(false)}
              size="icon"
              variant="outline"
              className="absolute right-4 top-4"
            >
              <X />
            </Button>
            <p className="py-4">
              Enter the STX address for the room you want to join:
            </p>
            <form>
              <input
                type="text"
                name="destination-address"
                className="border-1 border-slate-300 bg-slate-200 p-2 rounded w-full uppercase invalid:bg-red-300 invalid:border-red-400 mb-4"
                placeholder="ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
                pattern="^[A-Z0-9]+$"
                value={destinationAddress}
                onChange={(event) => setDestinationAddress(event.target.value)}
              />
              <Button type="submit" onClick={checkAccess}>
                Check Access
              </Button>
            </form>
            <Result status={roomStatus} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
