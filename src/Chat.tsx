import {
  ReactElement,
  useEffect,
  useState,
  memo,
  FormEventHandler,
  useRef
} from 'react';
import {
  AppConfig,
  ContractCallOptions,
  openContractCall,
  openSignatureRequestPopup,
  showConnect,
  UserSession
} from '@stacks/connect';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { StacksTestnet } from '@stacks/network';
import { io, Socket } from 'socket.io-client';
import { truncateAddress } from './lib/utils';
import { PostConditionMode, principalCV, uintCV } from '@stacks/transactions';
import { ExternalLink } from './external-link';

const contractAddress = 'ST203SGZM0XR3P4YSVD2XVMF1N63CRG2DRXT4C7AE';
const network = new StacksTestnet();

const Message = ({
  author,
  message,
  connectedAs
}: {
  author: string;
  message: string;
  connectedAs: string;
}) => {
  return (
    <div className="text-xs">
      <span className="font-bold">
        {connectedAs === author ? 'me' : truncateAddress(author)}
      </span>
      : {message}
    </div>
  );
};

const ChatRoom = memo(
  ({ holder, subject }: { holder: string; subject: string }) => {
    const socket = useRef<Socket>();
    const navigate = useNavigate();
    const [sellKeys, setSellKeys] = useState(false);
    const [sellInProgress, setSellInProgress] = useState(false);
    const [sellKeysTransaction, setSellKeysTransaction] = useState('');
    const [numberOfKeys, setNumberOfKeys] = useState(1);
    const [messages, setMessages] = useState<
      { author: string; message: string }[]
    >([]);
    const [status, setStatus] = useState<
      | 'init'
      | 'authenticating'
      | 'connecting'
      | 'connected'
      | 'disconnected'
      | 'error'
      | 'message signature failed'
      | 'error connecting to wallet'
    >('init');

    useEffect(() => {
      (async () => {
        try {
          if (status !== 'init') return;
          setStatus('authenticating');
          const appConfig = new AppConfig(['store_write', 'publish_data']);
          const userSession = new UserSession({ appConfig });

          if (userSession.isUserSignedIn()) {
            const response = await fetch('http://localhost:3010/challenge');
            const message = await response.text();
            openSignatureRequestPopup({
              message,
              network: new StacksTestnet(),
              onFinish: async ({ publicKey, signature }) => {
                setStatus('connecting');
                socket.current = io('http://localhost:3010', {
                  extraHeaders: { 'public-key': publicKey, signature, subject }
                });

                socket.current.on('connect', () => {
                  setStatus('connected');
                });

                socket.current.on('disconnect', () => {
                  setStatus('disconnected');
                });

                socket.current.on('message-broadcast', (data) => {
                  setMessages((oldMessages) => [
                    ...oldMessages,
                    { author: data.holder, message: data.message }
                  ]);
                });
                socket.current.on('error', console.error);
              },
              onCancel: () => {
                setStatus('message signature failed');
              }
            });
          } else {
            setStatus('error');
          }
        } catch (error) {
          if (
            JSON.stringify((error as unknown as Error).message) ===
            '[Connect] No installed Stacks wallet found'
          ) {
            return setStatus('error connecting to wallet');
          }
          setStatus('error');
        }
      })();
    }, [status]);

    const handleSendMessage: FormEventHandler = (event) => {
      event.preventDefault();
      const message = {
        author: holder,
        message: event.currentTarget.querySelector('input')!.value
      };
      socket.current?.emit('message', message.message);
      event.currentTarget.querySelector('input')!.value = '';
      return false;
    };

    const handleSellKeys = async (numberOfKeys: number) => {
      setSellInProgress(true);
      const txOptions: ContractCallOptions = {
        contractAddress,
        contractName: 'keys',
        functionName: 'sell-keys',
        functionArgs: [principalCV(subject), uintCV(numberOfKeys)],
        appDetails: {
          name: 'Hiro Friends',
          icon: 'src/favicon.svg'
        },
        senderKey:
          'b244296d5907de9864c0b0d51f98a13c52890be0404e83f273144cd5b9960eed01',
        network,
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          setSellKeysTransaction(data.txId);
          setSellInProgress(false);
        },
        onCancel: () => {
          setSellInProgress(false);
        }
      };
      openContractCall(txOptions);
    };

    const handleLeave = () => {
      socket.current?.close();
      navigate('/');
    };
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-8">
        <div className="flex flex-col mx-auto max-w-2xl p-4 bg-slate-200 rounded-lg">
          <div className="flex justify-between gap-4">
            <span className="text-xs">Room: {truncateAddress(subject)}</span>
            <span className="text-xs">
              Connected as: {truncateAddress(holder)}
            </span>
          </div>
          <div className="overflow-y-auto max-h-2xl h-48 my-4 bg-white p-2 rounded">
            {messages.length > 0 ? (
              messages.map((message, index) => (
                <Message
                  key={index}
                  connectedAs={holder}
                  author={message.author}
                  message={message.message}
                />
              ))
            ) : (
              <div className="flex items-center justify-center w-full h-full">
                <p className="text-center m-0 italic text-sm">
                  No messages yet
                </p>
              </div>
            )}
          </div>
          <form className="flex justify-between" onSubmit={handleSendMessage}>
            <input
              className="bg-slate-300 rounded w-48 focus:bg-slate-100 px-2 text-sm"
              type="text"
            />
            <Button type="submit">Send</Button>
          </form>
          <span className="text-xs text-center mt-2">{status}</span>
        </div>
        <div className="mt-2 flex self-center justify-between">
          <Button
            className="mt"
            variant="link"
            onClick={() => setSellKeys(true)}
          >
            {sellInProgress ? 'Selling...' : 'Sell Keys'}
          </Button>
          <Button className="mt" variant="link" onClick={handleLeave}>
            Leave Room
          </Button>
        </div>
        {sellKeys && (
          <>
            <div className="flex gap-2">
              <input
                type="number"
                className="border-1 border-slate-300 p-2"
                onChange={(e) => setNumberOfKeys(Number(e.currentTarget.value))}
                value={numberOfKeys}
              />
              <Button onClick={() => handleSellKeys(numberOfKeys)}>
                {sellInProgress ? 'Selling...' : 'Sell Keys'}
              </Button>
            </div>
            {sellKeysTransaction !== '' && (
              <span className="text-xs mt-2">
                Transaction sent.{' '}
                <ExternalLink
                  href={`https://explorer.hiro.so/txid/0x${sellKeysTransaction}?chain=testnet`}
                >
                  Check on explorer
                </ExternalLink>
              </span>
            )}
          </>
        )}
      </div>
    );
  }
);

function Chat(): ReactElement {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const { address: subjectAddress } = useParams<{ address: string }>();
  const appConfig = new AppConfig(['store_write', 'publish_data']);
  const userSession = new UserSession({ appConfig });
  const authOptions = {
    userSession,
    appDetails: {
      name: 'Hiro Friends',
      icon: 'src/favicon.svg'
    },
    redirectTo: `/chat/${subjectAddress}`,
    onFinish: () => {
      setIsSignedIn(true);
    }
  };

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      setIsSignedIn(true);
    } else {
      setIsSignedIn(false);
    }
  }, [userSession]);

  const connectWallet = () => {
    showConnect(authOptions);
  };

  if (!subjectAddress) {
    return <h1>Not Found</h1>;
  }

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="mx-auto max-w-2xl px-4">
          <div className="rounded-lg border bg-background p-8 text-center">
            <h1 className="mb-2 text-lg font-semibold">
              Welcome to HiroFriends
            </h1>
            <p className="leading-relaxed">
              Please, connect your wallet to continue:
            </p>

            <div className="my-4 flex flex-col items-center space-y-2">
              {userSession.isUserSignedIn() && (
                <span className="text-sm w-full bg-slate-100 p-4 rounded-lg">
                  {userSession.loadUserData().profile.stxAddress.testnet}
                </span>
              )}

              <Button
                onClick={connectWallet}
                variant="link"
                className="h-auto p-0 text-base"
              >
                Connect your wallet
                <ArrowRight size={15} className="ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ChatRoom
      subject={subjectAddress}
      holder={userSession.loadUserData().profile.stxAddress.testnet}
    />
  );
}

export default Chat;
