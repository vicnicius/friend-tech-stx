/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { initSimnet } from '@hirosystems/clarinet-sdk';
import { Cl } from '@stacks/transactions';
import { describe, expect, it } from 'vitest';

describe('Keys contract', async () => {
  const simnet = await initSimnet();
  const accounts = simnet.getAccounts();
  const address1 = accounts.get('wallet_1')!;
  const address2 = accounts.get('wallet_2')!;

  describe('buy-keys', () => {
    it('should only allow own principal to purchase initial keys', () => {
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

    it('should fail to buy keys if purchase is not successful', () => {
      // This wallet was defined with balance = 0
      const poorGuy = accounts.get('wallet_poor_guy')!;
      const { result: supplyForPrincipalBefore } = simnet.callReadOnlyFn(
        'keys',
        'get-supply',
        [Cl.standardPrincipal(poorGuy)],
        poorGuy
      );
      expect(supplyForPrincipalBefore).toEqual(Cl.uint(0));
      const { result: buyKeysResponse } = simnet.callPublicFn(
        'keys',
        'buy-keys',
        [Cl.standardPrincipal(poorGuy), Cl.uint(1)],
        poorGuy
      );
      const { result: supplyForPrincipalAfter } = simnet.callReadOnlyFn(
        'keys',
        'get-supply',
        [Cl.standardPrincipal(poorGuy)],
        poorGuy
      );
      expect(buyKeysResponse).toEqual(Cl.error(Cl.uint(101)));
      expect(supplyForPrincipalAfter).toEqual(Cl.uint(0));
    });
  });
});
