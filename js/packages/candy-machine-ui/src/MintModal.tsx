import styled from 'styled-components';
import { useState } from 'react';
import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Modal from '@material-ui/core/Modal';
import CardMedia from '@material-ui/core/CardMedia';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';
import MobileStepper from '@material-ui/core/MobileStepper';
import KeyboardArrowLeft from '@material-ui/icons/KeyboardArrowLeft';
import KeyboardArrowRight from '@material-ui/icons/KeyboardArrowRight';
import Button from '@material-ui/core/Button';
import Skeleton from '@material-ui/lab/Skeleton';
import SwipeableViews from 'react-swipeable-views';
// import { useEffect, useCallback } from 'react';
import { NFTData } from './utils';
// import { CircularProgress } from '@material-ui/core';

export const CTABox = styled(Box)`
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
`; // add your own styles here

const style = {
  position: 'absolute' as 'absolute',
  top: '50px',
  left: '50%',
  transform: 'translate(-50%, 0)',
  width: 400,
  backgroundColor: '#151A1F',
  border: '2px solid #000',
  borderRadius: 6,
  padding: 24,
};

export const MintModal = ({
  registerModalActions,
  mintedNFTsMetadata,
  loadNFTData,
}: {
  registerModalActions: any;
  mintedNFTsMetadata: NFTData[];
  loadNFTData: any;
}) => {
  const [open, setOpen] = useState(false);
  const handleOpen = () => {
    setOpen(true);
    loadNFTData(activeStep);
  };
  const handleClose = () => setOpen(false);
  const [activeStep, setActiveStep] = useState(0);
  const maxSteps = mintedNFTsMetadata.length;

  const handleNext = () => {
    const newStep = activeStep + 1;
    setActiveStep(prevActiveStep => prevActiveStep + 1);
    loadNFTData(newStep);
  };

  const handleBack = () => {
    const newStep = activeStep - 1;
    setActiveStep(prevActiveStep => prevActiveStep - 1);
    loadNFTData(newStep);
  };

  const handleStepChange = (step: number) => {
    setActiveStep(step);
  };

  registerModalActions(handleOpen, handleClose);

  // const refreshModalState = useCallback(async () => {
  //   // let dataAll = []
  //   // for(const mintedNFTMetadata of mintedNFTsMetadata){
  //   //   const res = await fetch(mintedNFTMetadata.data.uri);
  //   //   const data = await res.json();
  //   //   dataAll.push(data)
  //   // }
  //   // console.log(dataAll)
  //   // setNFTData(dataAll)
  //   await loadNFTData(activeStep)
  // }, [loadNFTData, activeStep])

  // useEffect(() => {
  //   refreshModalState()
  // }, [refreshModalState])

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Paper style={style}>
        <Box>
          <IconButton
            onClick={handleClose}
            style={{
              position: 'absolute' as 'absolute',
              top: '10px',
              right: '10px',
              zIndex: 1,
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
        <SwipeableViews
          // axis={theme.direction === 'rtl' ? 'x-reverse' : 'x'}
          axis={'x-reverse'}
          index={activeStep}
          onChangeIndex={handleStepChange}
          enableMouseEvents
        >
          {mintedNFTsMetadata.map((mintedNFTMetadata, index) => {
            const NFTData = mintedNFTMetadata.data;
            const NFTDataLoaded = Object.keys(NFTData).length;
            const NFTImageLoaded = mintedNFTMetadata.image.isLoaded;
            // const isImageLoaded = NFTData.image.complete && NFTData.image.naturalHeight !== 0;
            return (
              <div key={index}>
                {Math.abs(activeStep - index) <= 2 ? (
                  // <img className={classes.img} src={step.imgPath} alt={step.label} />
                  <>
                    {NFTDataLoaded ? (
                      <Typography
                        id="modal-modal-title"
                        variant="h6"
                        color="textPrimary"
                        style={{
                          fontWeight: 'bold',
                        }}
                      >
                        {NFTData.name}
                      </Typography>
                    ) : (
                      <Skeleton variant="text" width={250}>
                        <Typography
                          id="modal-modal-title"
                          variant="h6"
                          color="textPrimary"
                          style={{
                            fontWeight: 'bold',
                          }}
                        >
                          #
                        </Typography>
                      </Skeleton>
                    )}
                    {NFTDataLoaded ? (
                      <Typography
                        id="modal-modal-description"
                        variant="body2"
                        color="textSecondary"
                        style={{
                          marginBottom: '10px',
                        }}
                      >
                        {NFTData.description}
                      </Typography>
                    ) : (
                      <Skeleton variant="text" width={350}>
                        <Typography
                          id="modal-modal-description"
                          variant="body2"
                          color="textSecondary"
                          style={{
                            marginBottom: '10px',
                          }}
                        >
                          #
                        </Typography>
                      </Skeleton>
                    )}
                    <Box>
                      {NFTImageLoaded ? (
                        <CardMedia
                          data-src={NFTData.image}
                          component="img"
                          alt={NFTData.name}
                          width="250"
                          height="250"
                          image={NFTData.image}
                          title={NFTData.name}
                          style={{
                            width: 'auto',
                            margin: 'auto',
                            marginBottom: '10px',
                          }}
                        />
                      ) : (
                        <Skeleton
                          variant="rect"
                          width={250}
                          height={250}
                          style={{
                            margin: 'auto',
                            marginBottom: '10px',
                          }}
                        />
                      )}
                    </Box>
                    <Typography
                      id="modal-modal-attributes-label"
                      variant="body2"
                      color="textSecondary"
                    >
                      Attributes:
                    </Typography>
                    <List
                      disablePadding={true}
                      style={{
                        marginBottom: '15px',
                      }}
                    >
                      {NFTDataLoaded
                        ? NFTData.attributes?.map((attribute: any) => {
                            return (
                              <ListItem
                                key={attribute.trait_type}
                                style={{ paddingBottom: 0 }}
                              >
                                <ListItemText>
                                  <Typography
                                    variant="body2"
                                    color="textPrimary"
                                  >
                                    {attribute.trait_type}: {attribute.value}
                                  </Typography>
                                </ListItemText>
                              </ListItem>
                            );
                          })
                        : Array.from(Array(5).keys()).map((idx: any) => {
                            return (
                              <ListItem key={idx} style={{ paddingBottom: 0 }}>
                                <ListItemText>
                                  <Skeleton variant="text" width={200}>
                                    <Typography
                                      id="modal-modal-description"
                                      variant="body2"
                                      color="textPrimary"
                                    >
                                      #
                                    </Typography>
                                  </Skeleton>
                                </ListItemText>
                              </ListItem>
                            );
                          })}
                    </List>
                  </>
                ) : null}
              </div>
            );
          })}
        </SwipeableViews>
        <MobileStepper
          steps={maxSteps}
          position="static"
          variant="text"
          activeStep={activeStep}
          nextButton={
            <Button
              size="small"
              onClick={handleBack}
              disabled={activeStep === 0}
            >
              Next
              {/* theme.direction === 'rtl' ? <KeyboardArrowLeft /> : <KeyboardArrowRight /> */}
              <KeyboardArrowRight />
            </Button>
          }
          backButton={
            <Button
              size="small"
              onClick={handleNext}
              disabled={activeStep === maxSteps - 1}
            >
              {/* theme.direction === 'rtl' ? <KeyboardArrowRight /> : <KeyboardArrowLeft /> */}
              <KeyboardArrowLeft />
              Back
            </Button>
          }
        />
      </Paper>
    </Modal>
  );
};
