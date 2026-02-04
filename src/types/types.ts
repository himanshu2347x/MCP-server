
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