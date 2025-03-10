import React from "react";
import { Grid, Typography } from "@mui/material";
import OrderCard from "./OrderCard";

const OrderList: React.FC<{ orders: any[] }> = ({ orders }) => {
  return (
    <Grid container spacing={3}>
      {orders.length === 0 ? (
        <Typography variant="h6" align="center">Vous n'avez encore passé aucune commande.</Typography>
      ) : (
        orders.map((order) => (
          <Grid item xs={12} key={order._id}>
            <OrderCard order={order} />
          </Grid>
        ))
      )}
    </Grid>
  );
};

export default OrderList;
