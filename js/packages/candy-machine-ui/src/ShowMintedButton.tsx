import styled from 'styled-components';
import Button from '@material-ui/core/Button';

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

export const ShowMintedButton = ({ clickCallback }: { clickCallback: any }) => {
  return (
    <CTAButton
      onClick={() => {
        clickCallback();
      }}
    >
      Show Minted NFTs
    </CTAButton>
  );
};
