'use client';
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  Grid,
} from '@mui/material';

interface Order {
  _id: string;
  customerName: string;
  status: string;
  createdAt: string;
  totalPrice: number;
  items?: {
    name: string;
    quantity: number;
    price: number;
  }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  order: Order;
  editable: boolean;
}

const OrderDialog: React.FC<Props> = ({ open, onClose, order, editable }) => {
  const [status, setStatus] = useState(order.status);

  const handleSave = () => {
    console.log("Nouvel état :", status);
    // API call here to update status
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Détails de la commande</DialogTitle>
      <DialogContent dividers>
        <Typography variant="subtitle1" gutterBottom>
          Client : {order.customerName}
        </Typography>
        <Typography variant="body2" gutterBottom>
          Commande ID : {order._id}
        </Typography>
        <Typography variant="body2" gutterBottom>
          Total : {order.totalPrice.toFixed(2)} €
        </Typography>

        <Typography variant="h6" sx={{ mt: 2 }}>Produits :</Typography>
        <Grid container spacing={1}>
          {order.items?.map((item, index) => (
            <Grid item xs={12} key={index}>
              <Typography>
                {item.name} × {item.quantity} – {(item.price * item.quantity).toFixed(2)} €
              </Typography>
            </Grid>
          ))}
        </Grid>

        {editable ? (
          <TextField
            select
            label="Statut"
            fullWidth
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            sx={{ mt: 3 }}
            SelectProps={{ native: true }}
          >
            <option value="Pending">Pending</option>
            <option value="Preparing">Preparing</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </TextField>
        ) : (
          <Typography variant="body2" sx={{ mt: 3 }}>
            Statut actuel : <strong>{status}</strong>
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
        {editable && (
          <Button onClick={handleSave} variant="contained" color="primary">
            Enregistrer
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default OrderDialog;
