import styles from './Claim.module.scss';

import React, {useState, useEffect, useCallback} from 'react';
import {useForm, SubmitHandler} from 'react-hook-form';
import {ethers} from 'ethers';
import {RPC_URL, VAULT_ADDRESS} from 'constants/Token';

import {useAppSelector, useAppDispatch} from 'store/Hooks';

import {
  selectWallet,
  setStatus,
  setStake as setStakeState,
} from 'store/Slices/Wallet';

import Text from 'components/Common/Text';
import View from 'components/Common/View';
import Button from 'components/Common/Button';

type Inputs = {
  claim: number;
  earn: number;
};

const Vault = () => {
  const dispatch = useAppDispatch();
  const {wallet} = useAppSelector(selectWallet);

  const {register, handleSubmit, watch, setValue} = useForm<Inputs>();

  const [claim, setClaim] = useState<string>('');
  const [earn, setEarn] = useState<string>('');
  watch('earn');

  useEffect(() => {
    if (!wallet) {
      return;
    }

    const loadRewards = async () => {
      console.log('ouah');
      const provider = ethers.getDefaultProvider(RPC_URL);

      try {
        const value = await new ethers.Contract(
          VAULT_ADDRESS,
          [
            'function getRewardsEarned(address staker) public view returns (uint256)',
          ],
          provider,
        ).getRewardsEarned(wallet.address);

        setClaim(String(Math.round((parseInt(value) / 1e9) * 10000) / 10000));
      } catch (err: any) {
        console.warn(err);
      }
    };

    loadRewards();
  }, [wallet, setValue, setClaim]);

  useEffect(() => {
    const subscription = watch(async ({earn}) => {
      setEarn(`${earn}`);
    });

    return () => subscription.unsubscribe();
  }, [watch, setEarn]);

  const onSubmit: SubmitHandler<Inputs> = async ({earn}) => {
    earn = +earn;

    if (!wallet) {
      dispatch(setStatus('connecting'));
      dispatch(setStakeState(earn));
      return;
    }

    try {
      const tx2 = await new ethers.Contract(
        VAULT_ADDRESS,
        ['function withdraw(uint256 amount) public'],
        wallet.signer,
      ).withdraw(Math.floor(earn * 1e9));
      if (tx2) {
        alert('Successfully withdrawn your SAFUs');
      }
    } catch (e: any) {
      alert('It looks like something went wrong.');
      console.log(e, Math.floor(earn * 1e9));
    }
  };

  const onPressMax = useCallback(async () => {
    if (!wallet) {
      dispatch(setStatus('connecting'));
      return;
    }

    const provider = ethers.getDefaultProvider(RPC_URL);

    try {
      const value = await new ethers.Contract(
        VAULT_ADDRESS,
        [
          'function getStakerBalance(address staker) public view returns (uint256)',
        ],
        provider,
      ).getStakerBalance(wallet.address);

      console.log('value', value);

      setEarn(String(Math.round((parseInt(value) / 1e9) * 10000) / 10000));
    } catch (err: any) {
      console.warn(err);
    }
  }, [wallet, dispatch]);

  const onPressClaim = useCallback(async () => {
    if (!wallet) {
      dispatch(setStatus('connecting'));
      return;
    }

    try {
      const tx2 = await new ethers.Contract(
        VAULT_ADDRESS,
        ['function claim() public'],
        wallet.signer,
      ).claim();

      if (tx2) {
        alert('Successfully claimed your SAFUs');
      }
    } catch (e: any) {
      alert('Looks like something wrong happened.');
      console.warn(e);
    }

    setValue('claim', 0);
  }, [setValue, dispatch, wallet]);

  // set initial claim

  return (
    <View className={styles.vault}>
      <form className={styles['form']} onSubmit={handleSubmit(onSubmit)}>
        <View className={styles['input-container']}>
          <Text className={styles.label}>Claim</Text>
          <View className={styles['input-wrapper']}>
            <input
              className={styles.input}
              type="number"
              placeholder="..."
              value={claim}
              disabled
            />
            <View className={styles.token}>
              <Text className={styles.symbol}>SAFU</Text>
            </View>

            <Button
              onPress={onPressClaim}
              className={styles['claim-button']}
              label="CLAIM"
            />
            <View className="center"></View>
          </View>
        </View>

        <View className={styles['input-container']}>
          <Text className={styles.label}>Unstake</Text>
          <View className={styles['input-wrapper']}>
            <input
              className={styles.input}
              type="number"
              placeholder="..."
              required
              value={earn}
              id="earn"
              {...register('earn')}
            />
            <View className={styles.token}>
              <Text className={styles.symbol}>SAFU</Text>
            </View>
            <View className={styles.desc}>
              <Button onPress={onPressMax} className={styles.max}>
                max
              </Button>
            </View>
          </View>
        </View>

        <View className="center">
          <Button
            className={styles['stake-button']}
            type="submit"
            label="UNSTAKE"
          />
        </View>
      </form>
    </View>
  );
};

export default Vault;
