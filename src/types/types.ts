
export type OrderV2Response = {
  status: string;
  result: {
    solver_id: string;
    destination_swap: {
      asset: string;
      amount: string;
    } | null;
  };
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
  result: {
    source_swap: {
      chain: string;
    };
    destination_swap: {
      chain: string;
    };
    create_order: {
      additional_data?: {
        input_token_price: number;
        output_token_price: number;
      };
    };
  };
};

export type CheckResult =
  | { matched: false }
  | {
      matched: true;
      reason_code: string;
      summary: string;
      evidence: Record<string, any>;
    };
