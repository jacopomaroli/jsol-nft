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
  registerSetMetadata,
  registerModalActions,
}: {
  registerSetMetadata: any;
  registerModalActions: any;
}) => {
  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const [metadata, setMetadata] = useState({} as any);

  registerSetMetadata(setMetadata);
  registerModalActions(handleOpen, handleClose);

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
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography
          id="modal-modal-title"
          variant="h6"
          color="textPrimary"
          style={{
            fontWeight: 'bold',
          }}
        >
          {metadata?.name}
        </Typography>
        <Typography
          id="modal-modal-description"
          variant="body2"
          color="textSecondary"
          style={{
            marginBottom: '10px',
          }}
        >
          {metadata?.description}
        </Typography>
        <Box>
          <CardMedia
            data-src={metadata?.image}
            component="img"
            alt={metadata?.name}
            width="250"
            height="250"
            image={metadata?.image}
            title={metadata?.name}
            style={{ width: 'auto', margin: 'auto', marginBottom: '10px' }}
          />
        </Box>
        <Typography
          id="modal-modal-attributes-label"
          variant="body2"
          color="textSecondary"
        >
          Attributes:
        </Typography>
        <List disablePadding={true}>
          {metadata?.attributes?.map((attribute: any) => {
            return (
              <ListItem key={attribute.trait_type} style={{ paddingBottom: 0 }}>
                <ListItemText>
                  <Typography variant="body2" color="textPrimary">
                    {attribute.trait_type}: {attribute.value}
                  </Typography>
                </ListItemText>
              </ListItem>
            );
          })}
        </List>
      </Paper>
    </Modal>
  );
};
