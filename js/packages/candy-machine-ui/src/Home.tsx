import { useEffect, useMemo, useState, useCallback } from 'react';
import * as anchor from '@project-serum/anchor';
import retry from 'async-retry';

import styled from 'styled-components';
import { Container, Snackbar } from '@material-ui/core';
import Paper from '@material-ui/core/Paper';
import Alert from '@material-ui/lab/Alert';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import { PublicKey, Transaction } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletDialogButton } from '@solana/wallet-adapter-material-ui';
import {
  awaitTransactionSignatureConfirmation,
  CandyMachineAccount,
  CANDY_MACHINE_PROGRAM,
  getCandyMachineState,
  mintOneToken,
} from './candy-machine';
import {
  AlertState,
  toDate,
  formatNumber,
  getAtaForMint,
  NFTData,
} from './utils';
import { MintCountdown } from './MintCountdown';
import { MintButton } from './MintButton';
import { ShowMintedButton } from './ShowMintedButton';
import { GatewayProvider } from '@civic/solana-gateway-react';
import { Metadata } from '@metaplex-foundation/mpl-token-metadata';
import { sendTransaction } from './connection';
import { MintModal } from './MintModal';

const ConnectButton = styled(WalletDialogButton)`
  width: 100%;
  height: 60px;
  margin-top: 10px;
  margin-bottom: 5px;
  background: linear-gradient(180deg, #604ae5 0%, #813eee 100%);
  color: white;
  font-size: 16px;
  font-weight: bold;
`;

const MintContainer = styled.div``; // add your owns styles here

export interface HomeProps {
  candyMachineId?: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  txTimeout: number;
  rpcHost: string;
}

const Home = (props: HomeProps) => {
  const [isUserMinting, setIsUserMinting] = useState(false);
  const [candyMachine, setCandyMachine] = useState<CandyMachineAccount>();
  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: '',
    severity: undefined,
  });
  const [isActive, setIsActive] = useState(false);
  const [endDate, setEndDate] = useState<Date>();
  const [itemsRemaining, setItemsRemaining] = useState<number>();
  const [isWhitelistUser, setIsWhitelistUser] = useState(false);
  const [isPresale, setIsPresale] = useState(false);
  const [discountPrice, setDiscountPrice] = useState<anchor.BN>();
  const [mintedNFTsMetadata, setMintedNFTsMetadata] = useState<NFTData[]>([]);

  const rpcUrl = props.rpcHost;
  const wallet = useWallet();

  let modalOpen = () => {};
  // let modalClose = () => {}

  const registerModalActions = (handleOpen: any, handleClose: any) => {
    modalOpen = handleOpen;
    // modalClose = handleClose
  };

  // const getMintedNFTsMetadata = () => mintedNFTsMetadata

  const loadNFTData = async (index: number) => {
    console.log(index);
    const newMintedNFTsMetadata = [...mintedNFTsMetadata];
    const newNFTData: NFTData = { ...mintedNFTsMetadata[index] };
    const res = await fetch(newNFTData.blockchain.data.uri);
    const data = await res.json();
    newNFTData.data = data;
    newNFTData.image.image = new Image();
    newNFTData.image.image.onload = () => {
      const newMintedNFTsMetadata2 = [...newMintedNFTsMetadata];
      newMintedNFTsMetadata2[index].image.isLoaded = true;
      setMintedNFTsMetadata(newMintedNFTsMetadata2);
    };
    newNFTData.image.image.src = data.image;
    newNFTData.image.isLoaded = false;

    newMintedNFTsMetadata[index] = newNFTData;

    setMintedNFTsMetadata(newMintedNFTsMetadata);
  };

  const anchorWallet = useMemo(() => {
    if (
      !wallet ||
      !wallet.publicKey ||
      !wallet.signAllTransactions ||
      !wallet.signTransaction
    ) {
      return;
    }

    return {
      publicKey: wallet.publicKey,
      signAllTransactions: wallet.signAllTransactions,
      signTransaction: wallet.signTransaction,
    } as anchor.Wallet;
  }, [wallet]);

  const refreshCandyMachineState = useCallback(async () => {
    if (!anchorWallet || wallet.connecting) {
      return;
    }

    console.log(anchorWallet);

    if (props.candyMachineId) {
      try {
        const cndy = await getCandyMachineState(
          anchorWallet,
          props.candyMachineId,
          props.connection,
        );
        let active =
          cndy?.state.goLiveDate?.toNumber() < new Date().getTime() / 1000;
        let presale = false;
        // whitelist mint?
        if (cndy?.state.whitelistMintSettings) {
          // is it a presale mint?
          if (
            cndy.state.whitelistMintSettings.presale &&
            (!cndy.state.goLiveDate ||
              cndy.state.goLiveDate.toNumber() > new Date().getTime() / 1000)
          ) {
            presale = true;
          }
          // is there a discount?
          if (cndy.state.whitelistMintSettings.discountPrice) {
            setDiscountPrice(cndy.state.whitelistMintSettings.discountPrice);
          } else {
            setDiscountPrice(undefined);
            // when presale=false and discountPrice=null, mint is restricted
            // to whitelist users only
            if (!cndy.state.whitelistMintSettings.presale) {
              cndy.state.isWhitelistOnly = true;
            }
          }
          // retrieves the whitelist token
          const mint = new anchor.web3.PublicKey(
            cndy.state.whitelistMintSettings.mint,
          );
          const token = (await getAtaForMint(mint, anchorWallet.publicKey))[0];

          try {
            const balance = await props.connection.getTokenAccountBalance(
              token,
            );
            let valid = parseInt(balance.value.amount) > 0;
            // only whitelist the user if the balance > 0
            setIsWhitelistUser(valid);
            active = (presale && valid) || active;
          } catch (e) {
            setIsWhitelistUser(false);
            // no whitelist user, no mint
            if (cndy.state.isWhitelistOnly) {
              active = false;
            }
            console.log('There was a problem fetching whitelist token balance');
            console.log(e);
          }
        }
        // datetime to stop the mint?
        if (cndy?.state.endSettings?.endSettingType.date) {
          setEndDate(toDate(cndy.state.endSettings.number));
          if (
            cndy.state.endSettings.number.toNumber() <
            new Date().getTime() / 1000
          ) {
            active = false;
          }
        }
        // amount to stop the mint?
        if (cndy?.state.endSettings?.endSettingType.amount) {
          let limit = Math.min(
            cndy.state.endSettings.number.toNumber(),
            cndy.state.itemsAvailable,
          );
          if (cndy.state.itemsRedeemed < limit) {
            setItemsRemaining(limit - cndy.state.itemsRedeemed);
          } else {
            setItemsRemaining(0);
            cndy.state.isSoldOut = true;
          }
        } else {
          setItemsRemaining(cndy.state.itemsRemaining);
        }

        if (cndy.state.isSoldOut) {
          active = false;
        }

        setIsActive((cndy.state.isActive = active));
        setIsPresale((cndy.state.isPresale = presale));
        setCandyMachine(cndy);

        // console.log(cndy.program.account.collectionPda.programId.toBase58())

        const getAllNFTMetadata = async () => {
          // if(!wallet.publicKey === null) return []
          // const pkey = new PublicKey(wallet.publicKey?.toString() || '')
          const everyOwnerNFTMetadata = await Metadata.findDataByOwner(
            props.connection,
            anchorWallet.publicKey,
          );
          const collectionNFTMetadata = everyOwnerNFTMetadata.filter(
            metadata =>
              metadata?.collection?.key &&
              metadata?.collection?.key === process.env.REACT_APP_COLLECTION_ID,
          );
          return collectionNFTMetadata;
        };

        const allNFTMetadata = await getAllNFTMetadata();
        console.log(allNFTMetadata);
        const allNFTData: NFTData[] = allNFTMetadata.map(NFTMetadata => ({
          blockchain: NFTMetadata,
          data: {},
          image: {},
        }));
        setMintedNFTsMetadata(allNFTData);

        // const txId = '47Tm3a5mZdFRUKcxaFe6GNKvNyQoRUtyDRNDZUd2AXb8UP72NRw4SZD4BkMoswW9cQSj4bjPXTAtuAkQ7WorTyTY'
        // await fetchNFTMetadataFromTx(txId)
        // await updateMintedNFTsMetadataFromTxId(txId)
      } catch (e) {
        console.log('There was a problem fetching Candy Machine state');
        console.log(e);
      }
    }
  }, [anchorWallet, wallet, props.candyMachineId, props.connection]);

  const fetchNFTMetadataFromTx = async (txId: string) => {
    const getAllNFTMetadata = async () => {
      // if(!wallet.publicKey === null) return []
      // const pkey = new PublicKey(wallet.publicKey?.toString() || '')
      const everyOwnerNFTMetadata = await Metadata.findDataByOwner(
        props.connection,
        wallet.publicKey!,
      );
      const collectionNFTMetadata = everyOwnerNFTMetadata.filter(
        metadata =>
          metadata?.collection?.key &&
          metadata?.collection?.key === process.env.REACT_APP_COLLECTION_ID,
      );
      return collectionNFTMetadata;
    };

    console.log('fetching NFT metadata for txId: ' + txId);
    const allNFTMetadata = await getAllNFTMetadata();
    console.log(allNFTMetadata);
    const transaction = await retry(
      async (bail, attempt) => {
        console.log(`fetch transaction attempt: ${attempt}`);
        const transaction = await props.connection.getTransaction(txId);
        if (!transaction) {
          throw new Error('Cannot fetch transaction');
        }
        return transaction;
      },
      {
        retries: 5,
        factor: 1,
        minTimeout: 5000,
        randomize: false,
      },
    );

    console.log(transaction);
    const postTokenBalances = transaction?.meta?.postTokenBalances;
    console.log(postTokenBalances);
    if (postTokenBalances && postTokenBalances.length) {
      const nftAddrStr = postTokenBalances[0].mint;
      console.log(nftAddrStr);
      // const nftAddr = new anchor.web3.PublicKey(
      //   nftAddrStr,
      // );
      // const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
      //   'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
      // );
      // const metadata = await props.connection.getProgramAccounts(TOKEN_METADATA_PROGRAM_ID, {
      //   filters: [
      //     {
      //       memcmp: {
      //         offset:
      //           1 + // key
      //           32, // update auth
      //         bytes: nftAddrStr,
      //       },
      //     },
      //   ],
      // })
      // const metadata = await getMetadata(nftAddr)
      // console.log(metadata)

      const metadataPDA = await Metadata.getPDA(new PublicKey(nftAddrStr));
      const tokenMetadata = await Metadata.load(props.connection, metadataPDA);
      // console.log(tokenMetadata);
      // const res = await fetch(tokenMetadata.data.data.uri);
      // const data = await res.json();
      // console.log(data);
      return tokenMetadata;
    }
  };

  const updateMintedNFTsMetadataFromTxId = async (txId: string | undefined) => {
    if (!txId) return;

    const NFTMetadata = await fetchNFTMetadataFromTx(txId);
    if (!NFTMetadata) return;

    const newMintedNFTsMetadata = [...mintedNFTsMetadata];
    newMintedNFTsMetadata.push({
      blockchain: NFTMetadata!.data,
      data: {},
      image: {},
    });

    setMintedNFTsMetadata(newMintedNFTsMetadata);

    console.log('metadata updated');
    console.log(newMintedNFTsMetadata);
  };

  const onMint = async (
    beforeTransactions: Transaction[] = [],
    afterTransactions: Transaction[] = [],
  ) => {
    try {
      setIsUserMinting(true);
      document.getElementById('#identity')?.click();
      if (wallet.connected && candyMachine?.program && wallet.publicKey) {
        let mintOne = await mintOneToken(
          candyMachine,
          wallet.publicKey,
          beforeTransactions,
          afterTransactions,
        );

        const mintTxId = mintOne[0];

        let status: any = { err: true };
        if (mintTxId) {
          status = await awaitTransactionSignatureConfirmation(
            mintTxId,
            props.txTimeout,
            props.connection,
            true,
          );
        }

        if (status && !status.err) {
          // manual update since the refresh might not detect
          // the change immediately
          let remaining = itemsRemaining! - 1;
          setItemsRemaining(remaining);
          setIsActive((candyMachine.state.isActive = remaining > 0));
          candyMachine.state.isSoldOut = remaining === 0;
          setAlertState({
            open: true,
            message: 'Congratulations! Mint succeeded!',
            severity: 'success',
          });
          try {
            updateMintedNFTsMetadataFromTxId(mintTxId);
          } catch (e) {
            console.log('cannot update minted nft list');
          }
        } else {
          setAlertState({
            open: true,
            message: 'Mint failed! Please try again!',
            severity: 'error',
          });
        }
      }
    } catch (error: any) {
      let message = error.msg || 'Minting failed! Please try again!';
      if (!error.msg) {
        if (!error.message) {
          message = 'Transaction Timeout! Please try again.';
        } else if (error.message.indexOf('0x137')) {
          console.log(error);
          message = `SOLD OUT!`;
        } else if (error.message.indexOf('0x135')) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          console.log(error);
          message = `SOLD OUT!`;
          window.location.reload();
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }

      setAlertState({
        open: true,
        message,
        severity: 'error',
      });
      // updates the candy machine state to reflect the lastest
      // information on chain
      refreshCandyMachineState();
    } finally {
      setIsUserMinting(false);
    }
  };

  const toggleMintButton = () => {
    let active = !isActive || isPresale;

    if (active) {
      if (candyMachine!.state.isWhitelistOnly && !isWhitelistUser) {
        active = false;
      }
      if (endDate && Date.now() >= endDate.getTime()) {
        active = false;
      }
    }

    if (
      isPresale &&
      candyMachine!.state.goLiveDate &&
      candyMachine!.state.goLiveDate.toNumber() <= new Date().getTime() / 1000
    ) {
      setIsPresale((candyMachine!.state.isPresale = false));
    }

    setIsActive((candyMachine!.state.isActive = active));
  };

  useEffect(() => {
    refreshCandyMachineState();
  }, [
    anchorWallet,
    wallet,
    props.candyMachineId,
    props.connection,
    refreshCandyMachineState,
  ]);

  return (
    <Container style={{ marginTop: 100 }}>
      <Container maxWidth="xs" style={{ position: 'relative' }}>
        <MintModal
          registerModalActions={registerModalActions}
          mintedNFTsMetadata={mintedNFTsMetadata}
          loadNFTData={loadNFTData}
        />
        <Paper
          style={{
            padding: 24,
            paddingBottom: 10,
            backgroundColor: '#151A1F',
            borderRadius: 6,
          }}
        >
          {!wallet.connected ? (
            <ConnectButton>Connect Wallet</ConnectButton>
          ) : (
            <>
              {candyMachine && (
                <Grid
                  container
                  direction="row"
                  justifyContent="center"
                  wrap="nowrap"
                >
                  <Grid item xs={3}>
                    <Typography variant="body2" color="textSecondary">
                      Remaining
                    </Typography>
                    <Typography
                      variant="h6"
                      color="textPrimary"
                      style={{
                        fontWeight: 'bold',
                      }}
                    >
                      {`${itemsRemaining}`}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="textSecondary">
                      {isWhitelistUser && discountPrice
                        ? 'Discount Price'
                        : 'Price'}
                    </Typography>
                    <Typography
                      variant="h6"
                      color="textPrimary"
                      style={{ fontWeight: 'bold' }}
                    >
                      {isWhitelistUser && discountPrice
                        ? `◎ ${formatNumber.asNumber(discountPrice)}`
                        : `◎ ${formatNumber.asNumber(
                            candyMachine.state.price,
                          )}`}
                    </Typography>
                  </Grid>
                  <Grid item xs={5}>
                    {isActive && endDate && Date.now() < endDate.getTime() ? (
                      <>
                        <MintCountdown
                          key="endSettings"
                          date={getCountdownDate(candyMachine)}
                          style={{ justifyContent: 'flex-end' }}
                          status="COMPLETED"
                          onComplete={toggleMintButton}
                        />
                        <Typography
                          variant="caption"
                          align="center"
                          display="block"
                          style={{ fontWeight: 'bold' }}
                        >
                          TO END OF MINT
                        </Typography>
                      </>
                    ) : (
                      <>
                        <MintCountdown
                          key="goLive"
                          date={getCountdownDate(candyMachine)}
                          style={{ justifyContent: 'flex-end' }}
                          status={
                            candyMachine?.state?.isSoldOut ||
                            (endDate && Date.now() > endDate.getTime())
                              ? 'COMPLETED'
                              : isPresale
                              ? 'PRESALE'
                              : 'LIVE'
                          }
                          onComplete={toggleMintButton}
                        />
                        {isPresale &&
                          candyMachine.state.goLiveDate &&
                          candyMachine.state.goLiveDate.toNumber() >
                            new Date().getTime() / 1000 && (
                            <Typography
                              variant="caption"
                              align="center"
                              display="block"
                              style={{ fontWeight: 'bold' }}
                            >
                              UNTIL PUBLIC MINT
                            </Typography>
                          )}
                      </>
                    )}
                  </Grid>
                </Grid>
              )}
              <MintContainer>
                {candyMachine?.state.isActive &&
                candyMachine?.state.gatekeeper &&
                wallet.publicKey &&
                wallet.signTransaction ? (
                  <GatewayProvider
                    wallet={{
                      publicKey:
                        wallet.publicKey ||
                        new PublicKey(CANDY_MACHINE_PROGRAM),
                      //@ts-ignore
                      signTransaction: wallet.signTransaction,
                    }}
                    gatekeeperNetwork={
                      candyMachine?.state?.gatekeeper?.gatekeeperNetwork
                    }
                    clusterUrl={rpcUrl}
                    handleTransaction={async (transaction: Transaction) => {
                      setIsUserMinting(true);
                      const userMustSign = transaction.signatures.find(sig =>
                        sig.publicKey.equals(wallet.publicKey!),
                      );
                      if (userMustSign) {
                        setAlertState({
                          open: true,
                          message: 'Please sign one-time Civic Pass issuance',
                          severity: 'info',
                        });
                        try {
                          transaction = await wallet.signTransaction!(
                            transaction,
                          );
                        } catch (e) {
                          setAlertState({
                            open: true,
                            message: 'User cancelled signing',
                            severity: 'error',
                          });
                          // setTimeout(() => window.location.reload(), 2000);
                          setIsUserMinting(false);
                          throw e;
                        }
                      } else {
                        setAlertState({
                          open: true,
                          message: 'Refreshing Civic Pass',
                          severity: 'info',
                        });
                      }
                      try {
                        await sendTransaction(
                          props.connection,
                          wallet,
                          transaction,
                          [],
                          true,
                          'confirmed',
                        );
                        setAlertState({
                          open: true,
                          message: 'Please sign minting',
                          severity: 'info',
                        });
                      } catch (e) {
                        setAlertState({
                          open: true,
                          message:
                            'Solana dropped the transaction, please try again',
                          severity: 'warning',
                        });
                        console.error(e);
                        // setTimeout(() => window.location.reload(), 2000);
                        setIsUserMinting(false);
                        throw e;
                      }
                      await onMint();
                    }}
                    broadcastTransaction={false}
                    options={{ autoShowModal: false }}
                  >
                    <MintButton
                      candyMachine={candyMachine}
                      isMinting={isUserMinting}
                      setIsMinting={val => setIsUserMinting(val)}
                      onMint={onMint}
                      isActive={isActive || (isPresale && isWhitelistUser)}
                    />
                  </GatewayProvider>
                ) : (
                  <MintButton
                    candyMachine={candyMachine}
                    isMinting={isUserMinting}
                    setIsMinting={val => setIsUserMinting(val)}
                    onMint={onMint}
                    isActive={isActive || (isPresale && isWhitelistUser)}
                  />
                )}
                <ShowMintedButton clickCallback={() => modalOpen()} />
              </MintContainer>
            </>
          )}
          <Typography
            variant="caption"
            align="center"
            display="block"
            style={{ marginTop: 7, color: 'grey' }}
          >
            Powered by METAPLEX
          </Typography>
        </Paper>
      </Container>

      <Snackbar
        open={alertState.open}
        autoHideDuration={6000}
        onClose={() => setAlertState({ ...alertState, open: false })}
      >
        <Alert
          onClose={() => setAlertState({ ...alertState, open: false })}
          severity={alertState.severity}
        >
          {alertState.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

const getCountdownDate = (
  candyMachine: CandyMachineAccount,
): Date | undefined => {
  if (
    candyMachine.state.isActive &&
    candyMachine.state.endSettings?.endSettingType.date
  ) {
    return toDate(candyMachine.state.endSettings.number);
  }

  return toDate(
    candyMachine.state.goLiveDate
      ? candyMachine.state.goLiveDate
      : candyMachine.state.isPresale
      ? new anchor.BN(new Date().getTime() / 1000)
      : undefined,
  );
};

export default Home;
