import styles from './Connect.module.scss';

import React, {useCallback} from 'react';
import {ethers} from 'ethers';

import {setWallet} from 'store/Slices/Wallet';

import {useAppDispatch} from 'store/Hooks';

import Text from 'components/Common/Text';
import View from 'components/Common/View';
import Image from 'components/Common/Image';
import Button from 'components/Common/Button';

import MetaMaskImage from './res/MetaMask.png';
import TrustWalletImage from './res/TrustWallet.png';

const Connect = () => {
  const dispatch = useAppDispatch();

  const onPressMetaMask = useCallback(async () => {
    const provider = new ethers.providers.Web3Provider(
      (window as any).ethereum,
      'any',
    );

    // Prompt user for account connections
    await provider.send('eth_requestAccounts', []);
    const signer = provider.getSigner();
    const address = await signer.getAddress();

    console.log(`[Metamask] Connected account: ${address}`);

    // set wallet
    dispatch(
      setWallet({
        type: 'metamask',
        address,
        balance: 0,
        signer,
      }),
    );
  }, [dispatch]);

  const onPressTrustWallet = useCallback(() => {
    onPressMetaMask();
  }, [onPressMetaMask]);

  return (
    <View className={styles.connect}>
      <Text className={styles.title}>Connect wallet</Text>

      <View className={styles.block}>
        <View className={styles.logo}>
          <Image className={styles.metamask} src={MetaMaskImage.src} />
        </View>
        <View className={styles.info}>
          <Text className={styles.description}>
            Available as a browser extension and as a mobile app, MetaMask
            equips you with a key vault, secure login, token wallet, and token
            exchange—everything you need to manage your digital assets.
          </Text>
          <Button
            onPress={onPressMetaMask}
            className={styles['connect-wallet-button']}
            label="Connect with MetaMask"
          />
        </View>
      </View>

      <View className={styles.block}>
        <View className={styles.logo}>
          <Image className={styles.trustwallet} src={TrustWalletImage.src} />
        </View>
        <View className={styles.info}>
          <Text className={styles.description}>
            Trust Wallet is arguably the more secure mobile crypto wallet
            available today. However, it is still essential to follow the
            wallet&apos;s security instructions to ensure the utmost fund
            security.
          </Text>
          <Button
            onPress={onPressTrustWallet}
            className={styles['connect-wallet-button']}
            label="Connect with Trust Wallet"
          />
        </View>
      </View>
    </View>
  );
};

export default Connect;
