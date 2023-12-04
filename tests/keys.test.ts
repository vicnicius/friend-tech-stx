/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Simnet, initSimnet } from '@hirosystems/clarinet-sdk';
import { Cl, principalToString } from '@stacks/transactions';
import { beforeEach, describe, expect, it } from 'vitest';

describe('Keys contract', async () => {
  let simnet: Simnet;
  let accounts: Map<string, string>;
  let address1: string;
  let address2: string;
  let address3: string;
  let address4: string;
  let deployer: string;
  let poorGuy: string;
  beforeEach(async () => {
    simnet = await initSimnet();
    accounts = simnet.getAccounts();
    address1 = accounts.get('wallet_1')!;
    address2 = accounts.get('wallet_2')!;
    address3 = accounts.get('wallet_3')!;
    address4 = accounts.get('wallet_4')!;
    deployer = accounts.get('deployer')!;
    poorGuy = accounts.get('wallet_poor_guy')!;
  });

  describe('buy-keys', () => {
    it('should only allow own principal to create initial keys', () => {
      const { result: differentPrincipalTriesToBuyInitialKeys } =
        simnet.callPublicFn(
          'keys',
          'buy-keys',
          [Cl.standardPrincipal(address1), Cl.uint(1)],
          address2
        );

      expect(() =>
        simnet.getMapEntry(
          'keys',
          'keysSupply',
          Cl.tuple({ subject: Cl.standardPrincipal(address1) })
        )
      ).toThrowError();
      expect(differentPrincipalTriesToBuyInitialKeys).toEqual(
        Cl.error(Cl.uint(100))
      );

      const { result: principalBuyInitialKeysResponse } = simnet.callPublicFn(
        'keys',
        'buy-keys',
        [Cl.standardPrincipal(address1), Cl.uint(1)],
        address1
      );
      const supplyForPrincipalAfterValidBuy = simnet.getMapEntry(
        'keys',
        'keysSupply',
        Cl.tuple({ subject: Cl.standardPrincipal(address1) })
      );
      expect(principalBuyInitialKeysResponse).toEqual(Cl.ok(Cl.bool(true)));
      expect(supplyForPrincipalAfterValidBuy).toEqual(Cl.some(Cl.uint(1)));
    });

    it('should fail to init keys if stx transfer is not successful', () => {
      const { result: buyKeysResponse } = simnet.callPublicFn(
        'keys',
        'buy-keys',
        [Cl.standardPrincipal(poorGuy), Cl.uint(1)],
        poorGuy
      );
      expect(() =>
        simnet.getMapEntry(
          'keys',
          'keysSupply',
          Cl.tuple({ subject: Cl.standardPrincipal(poorGuy) })
        )
      ).toThrow();
      expect(buyKeysResponse).toEqual(Cl.error(Cl.uint(101)));
    });

    it('should transfer the "price" to the contract', () => {
      const { events } = simnet.callPublicFn(
        'keys',
        'buy-keys',
        [Cl.standardPrincipal(address1), Cl.uint(10)],
        address1
      );
      expect(events).toHaveLength(1);
      const stxTransfer = events[0];
      expect(stxTransfer.event).toBe('stx_transfer_event');
      expect(stxTransfer.data).toEqual({
        sender: address1,
        recipient: principalToString(Cl.contractPrincipal(deployer, 'keys')),
        amount: '20',
        memo: ''
      });
    });

    it('should allow a principal to buy keys', () => {
      // Initialize 10 keys for address 1;
      simnet.callPublicFn(
        'keys',
        'buy-keys',
        [Cl.standardPrincipal(address1), Cl.uint(10)],
        address1
      );
      // Address 2 buys keys from address 1;
      const { result: buyKeysResponse } = simnet.callPublicFn(
        'keys',
        'buy-keys',
        [Cl.standardPrincipal(address1), Cl.uint(1)],
        address2
      );
      const supplyForPrincipalAfterBuy = simnet.getMapEntry(
        'keys',
        'keysSupply',
        Cl.tuple({ subject: Cl.standardPrincipal(address1) })
      );
      const balanceForBuyerAfterBuy = simnet.getMapEntry(
        'keys',
        'keysBalance',
        Cl.tuple({
          subject: Cl.standardPrincipal(address1),
          holder: Cl.standardPrincipal(address2)
        })
      );
      expect(buyKeysResponse).toEqual(Cl.ok(Cl.bool(true)));
      expect(supplyForPrincipalAfterBuy).toStrictEqual(Cl.some(Cl.uint(11)));
      expect(balanceForBuyerAfterBuy).toStrictEqual(Cl.some(Cl.uint(1)));
    });

    it('should increase price after each purchase', () => {
      const { events: initKeyBuy } = simnet.callPublicFn(
        'keys',
        'buy-keys',
        [Cl.standardPrincipal(address1), Cl.uint(10)],
        address1
      );
      const initialTransfer = initKeyBuy[0];
      expect(Number(initialTransfer.data.amount)).toBe(20);

      const { events: firstBuy } = simnet.callPublicFn(
        'keys',
        'buy-keys',
        [Cl.standardPrincipal(address1), Cl.uint(10)],
        address2
      );
      const firstTransfer = firstBuy[0];
      expect(Number(firstTransfer.data.amount)).toBe(50);

      const { events: secondBuy } = simnet.callPublicFn(
        'keys',
        'buy-keys',
        [Cl.standardPrincipal(address1), Cl.uint(10)],
        address3
      );
      const secondTransfer = secondBuy[0];
      expect(Number(secondTransfer.data.amount)).toBe(100);

      const { events: thirdBuy } = simnet.callPublicFn(
        'keys',
        'buy-keys',
        [Cl.standardPrincipal(address1), Cl.uint(10)],
        address4
      );
      const thirdTransfer = thirdBuy[0];
      expect(Number(thirdTransfer.data.amount)).toBe(170);
    });
  });

  describe('sell-keys', () => {
    it('only allows to sell keys if seller holds enough of them', () => {
      const { result: sellKeysWithoutSupplyResult } = simnet.callPublicFn(
        'keys',
        'sell-keys',
        [Cl.standardPrincipal(address1), Cl.uint(10)],
        address4
      );
      expect(sellKeysWithoutSupplyResult).toEqual(Cl.error(Cl.uint(102)));

      // Address 1 starts supply
      simnet.callPublicFn(
        'keys',
        'buy-keys',
        [Cl.standardPrincipal(address1), Cl.uint(10)],
        address1
      );
      const { result: sellKeysWithSupplyButIsNotAHolderResult } =
        simnet.callPublicFn(
          'keys',
          'sell-keys',
          [Cl.standardPrincipal(address1), Cl.uint(10)],
          address4
        );
      expect(sellKeysWithSupplyButIsNotAHolderResult).toEqual(
        Cl.error(Cl.uint(102))
      );

      // Address 4 buys 5 keys for address1
      simnet.callPublicFn(
        'keys',
        'buy-keys',
        [Cl.standardPrincipal(address1), Cl.uint(5)],
        address4
      );
      const balanceForBuyerBeforeSell = simnet.getMapEntry(
        'keys',
        'keysBalance',
        Cl.tuple({
          subject: Cl.standardPrincipal(address1),
          holder: Cl.standardPrincipal(address4)
        })
      );
      expect(balanceForBuyerBeforeSell).toStrictEqual(Cl.some(Cl.uint(5)));

      // Sell more than own
      const { result: sellMoreKeysThanIsHoldingResult } = simnet.callPublicFn(
        'keys',
        'sell-keys',
        [Cl.standardPrincipal(address1), Cl.uint(10)],
        address4
      );
      expect(sellMoreKeysThanIsHoldingResult).toEqual(Cl.error(Cl.uint(102)));

      // Sell all keys owned
      const { result: sellHoldingKeysResult } = simnet.callPublicFn(
        'keys',
        'sell-keys',
        [Cl.standardPrincipal(address1), Cl.uint(5)],
        address4
      );
      const balanceForBuyerAfterSell = simnet.getMapEntry(
        'keys',
        'keysBalance',
        Cl.tuple({
          subject: Cl.standardPrincipal(address1),
          holder: Cl.standardPrincipal(address4)
        })
      );
      expect(sellHoldingKeysResult).toEqual(Cl.ok(Cl.bool(true)));
      expect(balanceForBuyerAfterSell).toStrictEqual(Cl.some(Cl.uint(0)));
    });

    it('should decrease price after each sell', () => {
      simnet.callPublicFn(
        'keys',
        'buy-keys',
        [Cl.standardPrincipal(address1), Cl.uint(10)],
        address1
      );
      simnet.callPublicFn(
        'keys',
        'buy-keys',
        [Cl.standardPrincipal(address1), Cl.uint(10)],
        address2
      );
      simnet.callPublicFn(
        'keys',
        'buy-keys',
        [Cl.standardPrincipal(address1), Cl.uint(10)],
        address3
      );
      simnet.callPublicFn(
        'keys',
        'buy-keys',
        [Cl.standardPrincipal(address1), Cl.uint(10)],
        address4
      );

      const { events: firstSell } = simnet.callPublicFn(
        'keys',
        'sell-keys',
        [Cl.standardPrincipal(address1), Cl.uint(10)],
        address1
      );
      const firstTransfer = firstSell[0];
      expect(Number(firstTransfer.data.amount)).toBe(170);

      const { events: secondSell } = simnet.callPublicFn(
        'keys',
        'sell-keys',
        [Cl.standardPrincipal(address1), Cl.uint(10)],
        address2
      );
      const secondTransfer = secondSell[0];
      expect(Number(secondTransfer.data.amount)).toBe(100);

      const { events: thirdSell } = simnet.callPublicFn(
        'keys',
        'sell-keys',
        [Cl.standardPrincipal(address1), Cl.uint(10)],
        address3
      );
      const thirdTransfer = thirdSell[0];
      expect(Number(thirdTransfer.data.amount)).toBe(50);

      const { events: fourthSell } = simnet.callPublicFn(
        'keys',
        'sell-keys',
        [Cl.standardPrincipal(address1), Cl.uint(10)],
        address4
      );
      const fourthTransfer = fourthSell[0];
      expect(Number(fourthTransfer.data.amount)).toBe(20);
    });
  });
});
