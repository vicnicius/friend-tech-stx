import { ReactElement, useEffect, useState } from 'react';
import {
  AppConfig,
  FinishedAuthData,
  showConnect,
  UserSession
} from '@stacks/connect';

import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ExitIcon } from '@radix-ui/react-icons';
import { JoinRoomPopup } from './components/ui/join-room-popup';

function App(): ReactElement {
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');

  const appConfig = new AppConfig(['store_write', 'publish_data']);
  const userSession = new UserSession({ appConfig });

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      setAddress(userSession.loadUserData().profile.stxAddress.testnet);
    } else {
      setAddress('');
    }
  }, [userSession]);

  const authOptions = {
    userSession,
    appDetails: {
      name: 'Hiro Friends',
      icon: 'src/favicon.svg'
    },
    onFinish: (data: FinishedAuthData) => {
      const userData = data.userSession.loadUserData();
      setAddress(userData.profile.stxAddress.testnet); // or .testnet for testnet
    },
    onCancel: () => {
      setError('Something went wrong while autheticating');
    },
    redirectTo: '/'
  };

  const connectWallet = () => {
    showConnect(authOptions);
  };

  const disconnectWallet = () => {
    if (userSession.isUserSignedIn()) {
      userSession.signUserOut('/');
      setAddress('');
    }
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="mx-auto max-w-2xl px-4">
          <div className="rounded-lg border bg-background p-8 text-center">
            <h1 className="mb-2 text-lg font-semibold">
              Welcome to HiroFriends
            </h1>
            <p className="leading-relaxed">
              {userSession.isUserSignedIn()
                ? 'You are connected as:'
                : 'Connect your wallet and start chatting'}
            </p>

            <div className="my-4 flex flex-col items-center space-y-2">
              {address && (
                <span className="text-sm w-full bg-slate-100 p-4 rounded-lg">
                  {address}
                </span>
              )}
              {userSession.isUserSignedIn() ? (
                <div className="flex items-center space-x-4">
                  <Button variant="outline">
                    <Link to={`/chat/${address}`}>Go to your room</Link>
                  </Button>
                  <JoinRoomPopup address={address} />
                </div>
              ) : (
                <Button
                  onClick={connectWallet}
                  variant="link"
                  className="h-auto p-0 text-base"
                >
                  Connect your wallet
                  <ArrowRight size={15} className="ml-1" />
                </Button>
              )}
            </div>
            {userSession.isUserSignedIn() && (
              <Button onClick={disconnectWallet} variant="link" size="sm">
                Disconnect <ExitIcon className="ml-2" />
              </Button>
            )}
            {error.length > 0 ?? <p>{error}</p>}
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
