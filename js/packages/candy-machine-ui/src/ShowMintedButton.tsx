import styled from 'styled-components';
import Button from '@material-ui/core/Button';
import { CircularProgress } from '@material-ui/core';
import { NFTData } from './utils';

export const CTAButton = styled(Button)`
  width: 100%;
  height: 60px;
  margin-top: 10px;
  margin-bottom: 5px;
  background: linear-gradient(180deg, #604ae5 0%, #813eee 100%);
  color: white;
  font-size: 16px;
  font-weight: bold;
`; // add your own styles here

export const ShowMintedButton = ({
  NFTsMetadataLoaded,
  mintedNFTsMetadata,
  clickCallback,
}: {
  NFTsMetadataLoaded: boolean;
  mintedNFTsMetadata: NFTData[];
  clickCallback: any;
}) => {
  const getShowMintedButtonContent = () => {
    if (!NFTsMetadataLoaded) {
      return <CircularProgress />;
    }

    return 'Show Minted NFTs';
  };

  return (
    <CTAButton
      disabled={!NFTsMetadataLoaded || !mintedNFTsMetadata.length}
      onClick={() => {
        clickCallback();
      }}
    >
      {getShowMintedButtonContent()}
    </CTAButton>
  );
};
