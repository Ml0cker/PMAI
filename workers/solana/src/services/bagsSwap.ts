/**
 * PLACEHOLDER: Bags.fm SDK Integration
 *
 * When the Bags.fm SDK is available, this module will handle:
 * 1. Constructing a swap transaction via Bags.fm (token -> Bags)
 * 2. Including the burn instruction in the same transaction
 * 3. Returning the combined transaction for the user to sign
 *
 * UI text references:
 * - "Pay with Bags (via Bags.fm)"
 * - "Powered by Bags.fm"
 *
 * Expected interface:
 *
 * import { Bags } from '@bags-fm/sdk';
 *
 * const bags = new Bags(connection, { commitment: 'confirmed' });
 *
 * const swapTx = await bags.createSwapAndBurnTx({
 *   userWallet: userPublicKey,
 *   inputMint: SOL_MINT,
 *   outputMint: BAGS_MINT,
 *   burnAmount: BURN_AMOUNT,
 *   destination: undefined,
 * });
 *
 * const signedTx = await signTransaction(swapTx);
 * const signature = await connection.sendRawTransaction(signedTx.serialize());
 */

export class BagsSwapPlaceholder {
  /**
   * Constructs a swap + burn transaction via Bags.fm.
   * NOT YET IMPLEMENTED - returns placeholder instruction.
   */
  async createSwapAndBurnTx(_params: {
    userWallet: string;
    inputMint: string;
    outputMint: string;
    burnAmount: bigint;
  }) {
    throw new Error('Bags.fm SDK integration not yet implemented. Use SPL Token burn directly.');
  }
}
