
export type OrderV2Response = {
  status: string;
  result: GardenOrderV2;
};

export type GardenOrderV2 = {
  solver_id: string;
  source_swap: {
    asset: string;
    amount: string;
    filled_amount: string;
    redeem_tx_hash?: string;
    asset_price?: number;
  } | null;
  destination_swap: {
    asset: string;
    amount: string;
    filled_amount: string;
    redeem_tx_hash?: string;
    asset_price?: number;
  } | null;
};

export type LiquidityResponse = {
  status: string;
  result: Array<{
    solver_id: string;
    liquidity: Array<{
      asset: string;
      balance: string;
      readable_balance: string;
      fiat_value: string;
    }>;
  }>;
};
export type GardenOrder = {
  create_order: {
    source_chain: string;
    destination_chain: string;
    additional_data: {
      input_token_price: number;
      output_token_price: number;
    };
  };
};

export type OrderV1Response = {
  status: string;
  result: GardenOrderV1;
};

export type GardenOrderV1 = {
  create_order: {
    created_at: string;
    additional_data?: { 
      deadline?: number;
      input_token_price?: number;
      output_token_price?: number;
    };
    source_chain: string;
    destination_chain: string;
  };
  source_swap: {
    chain: string;
    initiate_timestamp?: string;
    required_confirmations: number;
    current_confirmations: number;
  };
  destination_swap: {
    chain: string;
  };
};

export type FiatPricesResponse = {
  status: string;
  result: Record<string, number>;
};

export type CheckResult =
  | { matched: false }
  | {
      matched: true;
      reason_code: string;
      summary: string;
      evidence: Record<string, any>;
    };
