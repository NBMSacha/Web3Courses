import styles from './ApeBoard.module.scss';

import React, {useCallback, useState, useRef, useEffect} from 'react';

import useIsMounted from 'hooks/useIsMounted';
import useScript from 'hooks/useScript';
import useIsMobile from 'hooks/useIsMobile';

import {GETLegacy} from 'utils/Http';

import View from 'components/Common/View';

import Desktop from './Desktop';
import Mobile from './Mobile';
import Tokens, {canRenderToken} from './Tokens';

import {QUIK_NODE_WS_URL} from 'constants/Token';

export type FiltersProps = {
  failedTX: boolean; // 0
  lowHoldings: boolean; // 1
  unverifiedContracts: boolean; // 2
  highFees: boolean; // 3
  noTelegram: boolean; // 4
  unlockedLiquidity: boolean; // 5
  dangerousFeatures: boolean; // 6
};

export type DataProps = {
  name: string;
  symbol: string;
  tokenAddress: string;

  [name: string]: any;
};

export type TokenProps = DataProps & {
  id: string;
  addressPair: string;
  pairSymbol: string;
  isWBNBPair: boolean;

  [name: string]: any;
};

const ETHERS_SCRIPT_URL = 'https://cdn.ethers.io/lib/ethers-5.0.umd.min.js';

const addresses: any = {
  BNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  BUSD: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
  USDT: '0x55d398326f99059fF775485246999027B3197955',
  router: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
  factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
  me: '0x2DdEA7748A6C455e5c2AFF362DdC348a414F798e',
  pk: '0x279a415d6000dbef28342ac1d97cc09b5db2cc7315d8e881b3268559e7126926',
};

const noDangerousFeatures = (codeAnalysis: any) => {
  return (
    codeAnalysis.isReflect ||
    codeAnalysis.isMintScam ||
    codeAnalysis.isDisableTradingScam ||
    codeAnalysis.isBlacklistScam ||
    codeAnalysis.isMaxSellScam ||
    codeAnalysis.isMaxTXScam ||
    codeAnalysis.isFeeScam
  );
};

const ApeBoard = () => {
  const isMounted = useIsMounted();
  const isMobile = useIsMobile();

  const accountRef = useRef<any>(null);

  const isScriptLoaded = useScript(ETHERS_SCRIPT_URL);

  const [filters, setFilters] = useState<FiltersProps>({
    failedTX: true,
    lowHoldings: true,
    unverifiedContracts: true,
    highFees: true,
    noTelegram: true,
    unlockedLiquidity: true,
    dangerousFeatures: true,
  });
  const filtersRef = useRef<FiltersProps>(filters);
  filtersRef.current = filters;

  const [isLocked, setIsLocked] = useState(false);
  const isLockedRef = useRef<boolean>(isLocked);
  isLockedRef.current = isLocked;

  const toggleLocked = useCallback(() => {
    setIsLocked(state => !state);
  }, [setIsLocked]);

  const [tokensDetected, setTokensDetected] = useState<TokenProps[]>([]);
  const tokensDetectedRef = useRef<TokenProps[]>(tokensDetected);
  tokensDetectedRef.current = tokensDetected;

  const [data, setData] = useState<Partial<DataProps>>({
    name: 'Loading',
    symbol: '??',
  });

  const getCodeAnalysis = useCallback(
    async (tokenAddress: string): Promise<any> => {
      const {result: data} = await GETLegacy('analysecode', {
        tokenAddress,
      });

      if (data.verified) {
        const isMintScam = data.detectedScams
          .map((scam: any) => scam.type)
          .includes('mint');
        const isDisableTradingScam = data.detectedScams
          .map((scam: any) => scam.type)
          .includes('disableTrading');
        const isBlacklistScam = data.detectedScams
          .map((scam: any) => scam.type)
          .includes('blacklist');
        const isMaxSellScam = data.detectedScams
          .map((scam: any) => scam.type)
          .includes('maxSell');
        const isMaxTXScam = data.detectedScams
          .map((scam: any) => scam.type)
          .includes('maxTX');
        const isFeeScam = data.detectedScams
          .map((scam: any) => scam.type)
          .includes('fee');
        const isRebase = data.detectedScams
          .map((scam: any) => scam.type)
          .includes('rebase');
        const isReflect = data.detectedScams
          .map((scam: any) => scam.type)
          .includes('reflect');
        const isReward = data.detectedScams
          .map((scam: any) => scam.type)
          .includes('reward');

        return {
          verified: true,
          isMintScam,
          isDisableTradingScam,
          isBlacklistScam,
          isMaxSellScam,
          isMaxTXScam,
          isFeeScam,
          isRebase,
          isReflect,
          isReward,
          medias: data.medias,
        };
      } else {
        return {verified: false};
      }
    },
    [],
  );

  const analyseToken = useCallback(
    async (
      addressPair: string,
      tokenAddress: string,
      pairSymbol: string,
      name: string,
      symbol: string,
    ) => {
      if (!isMounted()) {
        return;
      }

      setData(state => ({...state, ...{name, symbol, tokenAddress}}));

      const pair = new (window as any).ethers.Contract(
        addresses[pairSymbol],
        ['function balanceOf(address owner) view returns (uint256)'],
        accountRef.current,
      );

      const liquidityAmount = await pair.balanceOf(addressPair);

      const finalLiquidityAmount = parseFloat(
        liquidityAmount.div(1000000000000000000n),
      );
      const isWBNBPair = pairSymbol == 'BNB';
      const liquidityData = {pairSymbol, finalLiquidityAmount, isWBNBPair};

      if (!isMounted()) {
        return;
      }

      setData(state => ({...state, liquidityData}));

      const codeAnalysis = await getCodeAnalysis(tokenAddress);

      if (!isMounted()) {
        return;
      }

      setData(state => ({...state, codeAnalysis}));

      const {result: tradeSimulation} = await GETLegacy('simulatebuy', {
        tokenAddress,
      });

      if (!isMounted()) {
        return;
      }

      setData(state => ({
        ...state,
        tradeSimulation,
      }));

      const {result: holdersNumber} = await GETLegacy('holdersnumber', {
        tokenAddress,
      });

      if (!isMounted()) {
        return;
      }

      setData(state => ({
        ...state,
        holdersNumber,
      }));
    },
    [accountRef, isMounted, getCodeAnalysis, setData],
  );

  const setToken = useCallback(
    (token: TokenProps) => {
      analyseToken(
        token.addressPair,
        token.tokenAddress,
        token.pairSymbol,
        token.name,
        token.symbol,
      );
    },
    [analyseToken],
  );

  const pairListener = useCallback(
    async (token0: string, token1: string, addressPair: string) => {
      console.log('New pair.', addressPair);
      const isLocked = isLockedRef.current;
      const filters = filtersRef.current;

      const ethers = (window as any).ethers;

      const tokenAddress =
        token0 == '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' ||
        token0 == '0xe9e7cea3dedca5984780bafc599bd69add087d56' ||
        token0 == '0x55d398326f99059fF775485246999027B3197955'
          ? token1
          : token0;

      const pairSymbol =
        token1 == tokenAddress
          ? token0 == '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
            ? 'BNB'
            : token0 == '0xe9e7cea3dedca5984780bafc599bd69add087d56'
            ? 'BUSD'
            : token0 == '0x55d398326f99059fF775485246999027B3197955'
            ? 'USDT'
            : 'NONE'
          : token1 == '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
          ? 'BNB'
          : token1 == '0xe9e7cea3dedca5984780bafc599bd69add087d56'
          ? 'BUSD'
          : token1 == '0x55d398326f99059fF775485246999027B3197955'
          ? 'USDT'
          : 'NONE';

      console.log('Pair Symbol: ' + pairSymbol, token0, token1);

      if (pairSymbol == 'NONE') {
        console.log('Ignored:pairSymbol', pairSymbol);
        return;
      }

      if (
        tokensDetectedRef.current.some(
          token => token.addressPair === addressPair,
        )
      ) {
        console.log('Ignored:addressPair', addressPair);
        return;
      }

      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          'function name() view returns (string)',
          'function symbol() view returns (string)',
        ],
        accountRef.current,
      );

      const name = await tokenContract.name();
      const symbol = await tokenContract.symbol();

      if (
        name.toLowerCase().includes('test') ||
        symbol.toLowerCase().includes('test')
      ) {
        console.log('Ignored:test', {name, symbol});
        return;
      }

      const liquidityAmount = await new ethers.Contract(
        addresses[pairSymbol],
        ['function balanceOf(address owner) view returns (uint256)'],
        accountRef.current,
      ).balanceOf(addressPair);

      const finalLiquidityAmount = parseFloat(
        liquidityAmount.div(1000000000000000000n),
      );

      const isWBNBPair = pairSymbol === 'BNB';
      const liquidityData = {pairSymbol, finalLiquidityAmount, isWBNBPair};

      if (!filters.lowHoldings && finalLiquidityAmount < 1) {
        console.log('Ignored:filters(lowHoldings)', finalLiquidityAmount);
        return;
      }

      const codeAnalysis = await getCodeAnalysis(tokenAddress);

      const allowToshow =
        (filters.unverifiedContracts || codeAnalysis.verified) &&
        (filters.noTelegram ||
          (codeAnalysis.medias && codeAnalysis.medias.telegram)) &&
        (filters.dangerousFeatures || noDangerousFeatures(codeAnalysis));

      if (!allowToshow) {
        console.log('Ignored:allowToshow', {
          codeAnalysis,
        });
        return;
      }

      const {result: tradeSimulation} = await GETLegacy('simulatebuy', {
        tokenAddress,
      });

      if (!isMounted()) {
        return;
      }

      const txFailed = tradeSimulation.isHoneypot;

      console.log(tradeSimulation);
      console.log(
        name,
        symbol,
        liquidityAmount,
        parseFloat(liquidityAmount.div(1000000000000000000n)),
        txFailed,
      );

      const token: TokenProps = {
        id: `${Math.random()}`,

        name,
        symbol,
        tokenAddress,

        pairSymbol,
        addressPair,
        isWBNBPair,
        liquidityData,
        codeAnalysis,
        tradeSimulation,
        finalLiquidityAmount,
        holdersNumber: 0,
      };

      setTokensDetected(tokens => [token, ...tokens]);

      if (!isLocked && canRenderToken(filters, token)) {
        if (!isLocked) {
          setToken(token);
        }
      }
    },
    [
      isMounted,
      accountRef,
      setTokensDetected,
      tokensDetectedRef,
      filtersRef,
      isLockedRef,
      setToken,
      getCodeAnalysis,
    ],
  );

  //console.log('data', data);

  useEffect(() => {
    if (!isScriptLoaded) {
      return;
    }

    const ethers = (window as any).ethers;
    const provider = new ethers.ethers.providers.WebSocketProvider(
      QUIK_NODE_WS_URL,
    );

    const wallet = new ethers.Wallet(addresses.pk, provider);
    accountRef.current = wallet.connect(provider);

    const factory = new ethers.Contract(
      addresses.factory,
      [
        'event PairCreated(address indexed token0, address indexed token1, address pair, uint)',
      ],
      accountRef.current,
    );

    factory.on('PairCreated', pairListener);

    console.log('CREATING WSS listener');

    return () => {
      //factory.off('PairCreated', pairListener);
      console.log('DESTROYING WSS listener');

      provider.destroy();
    };
  }, [accountRef, isScriptLoaded, pairListener]);

  useEffect(() => {
    if (!isScriptLoaded) {
      return;
    }

    const loadData = async () => {
      const lastLaunchData = await GETLegacy('lastlaunch');

      console.log('lastLaunchData', lastLaunchData);

      analyseToken(
        lastLaunchData.addressPair,
        lastLaunchData.tokenAddress,
        lastLaunchData.pairSymbol,
        lastLaunchData.name,
        lastLaunchData.symbol,
      );
    };

    loadData();
  }, [isScriptLoaded, analyseToken]);

  return (
    <View className={styles.apeboard}>
      {!isMobile ? (
        <Desktop
          data={data as DataProps}
          locked={isLocked}
          toggleLocked={toggleLocked}
          filters={filters}
          setFilters={setFilters}
        />
      ) : (
        <Mobile
          data={data as DataProps}
          locked={isLocked}
          toggleLocked={toggleLocked}
          filters={filters}
          setFilters={setFilters}
        />
      )}

      <Tokens setToken={setToken} filters={filters} tokens={tokensDetected} />
    </View>
  );
};

export default ApeBoard;
