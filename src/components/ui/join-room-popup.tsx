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
import { useNavigate } from 'react-router-dom';
import { openContractCall } from '@stacks/connect';

const successStatus = 'You are a key holder.';
const notAHolderMessage = 'You are not a key holder';
const contractAddress = 'ST203SGZM0XR3P4YSVD2XVMF1N63CRG2DRXT4C7AE';
const network = new StacksTestnet();

const Result = ({
  status,
  subject
}: {
  status: string;
  subject: string;
  isHolder: boolean;
}) => {
  const navigate = useNavigate();
  const [numberOfKeys, setNumberOfKeys] = useState(1);
  const handleBuyKeys = async (numberOfKeys: number) => {
    const txOptions = {
      contractAddress,
      contractName: 'keys',
      functionName: 'buy-keys',
      functionArgs: [principalCV(subject), uintCV(numberOfKeys)],
      appDetails: {
        name: 'Hiro Friends',
        icon: 'src/favicon.svg'
      },
      senderKey:
        'b244296d5907de9864c0b0d51f98a13c52890be0404e83f273144cd5b9960eed01',
      validateWithAbi: true,
      network
      // TODO: postConditions
    };
    openContractCall(txOptions);
  };
  const isHolder = status === successStatus;
  if (isHolder) {
    return (
      <div className="mt-4 border-t border-slate-300 border-dashed w-full py-2 italic">
        <p className="mb-2">You are a key holder</p>
        <div className="flex gap-2">
          <Button onClick={() => navigate(`/chat/${subject}`)}>
            Join Room
          </Button>
          <Button variant="secondary">Sell Keys</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-4 border-t border-slate-300 border-dashed w-full py-2 italic">
      <p className="mb-2">{status}</p>
      {status === notAHolderMessage && (
        <div className="flex gap-2">
          <input
            type="number"
            className="border-1 border-slate-300 p-2"
            onChange={(e) => setNumberOfKeys(Number(e.currentTarget.value))}
            value={numberOfKeys}
          />
          <Button onClick={() => handleBuyKeys(numberOfKeys)}>Buy Keys</Button>
        </div>
      )}
    </div>
  );
};

const checkIfIsHolder = async (
  holder: string,
  subject: string,
  senderAddress: string
) => {
  const contractName = 'keys';
  const functionName = 'is-keyholder';

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
  const [isHolder, setIsHolder] = useState(false);
  const [subjectAddress, setSubjectAddress] = useState('');
  const [roomStatus, setRoomStatus] = useState('');
  const checkAccess: MouseEventHandler = (event) => {
    event.preventDefault();
    if (subjectAddress.length === 0) {
      setRoomStatus('Please enter a valid destination address.');
      return;
    }
    setRoomStatus('Checking...');
    checkIfIsHolder(address, subjectAddress, address)
      .then((isHolder) => {
        console.log({ isHolder });
        setRoomStatus(notAHolderMessage);
        // Check result and follow-up
        if (isHolder) {
          setIsHolder(true);
        }
      })
      .catch((error) => {
        console.error(error);
        setRoomStatus(`Sorry, we couldn't verify the room status this time.`);
      });
  };
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
        Find Room
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="w-full h-full bg-slate-900 bg-opacity-90 fixed inset-0" />
        <Dialog.Content className="fixed flex w-full h-full items-center justify-center inset-0">
          <div className="bg-slate-50 flex w-full max-w-xl h-full max-h-96 rounded-lg flex-col p-8 relative">
            <Dialog.Title className="text-3xl">Find Room</Dialog.Title>
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
                value={subjectAddress}
                onChange={(event) => setSubjectAddress(event.target.value)}
              />
              <Button type="submit" onClick={checkAccess}>
                Check Access
              </Button>
            </form>
            <Result
              status={roomStatus}
              subject={subjectAddress}
              isHolder={isHolder}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
