import React, { useState, useEffect } from "react";
import { Stack, Avatar, Typography, Box } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";
import api from "@/lib/api";

const OrderItem: React.FC<{ item: any }> = ({ item }) => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL!;
  const [liked, setLiked] = useState(item.liked);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item.liked === undefined || item.liked === null) {
      const fetchLiked = async () => {
        try {
          const res = await api.get(`/order/item-liked/${item._id}`);
          setLiked(res.data.liked);
        } catch (e) {
          // ignore erreur silencieusement
        }
      };
      fetchLiked();
    } else {
      setLiked(item.liked);
    }
  }, [item._id, item.liked]);

  const handleLike = async () => {
    setLoading(true);
    try {
      await api.patch(`/order/like-item`, { itemId: item._id, liked: !liked });
      setLiked(!liked);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mb: 1.5 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar
            src={`${API_URL}/${item.image_url}` || "/default-food.png"}
            sx={{ width: 50, height: 50, borderRadius: 2 }}
            variant="rounded"
          />
          <Box>
            <Typography fontWeight="bold">{item.name}</Typography>
            {item.size && (
              <Typography variant="caption" color="text.secondary">
                Taille: {item.size}
              </Typography>
            )}
          </Box>
        </Stack>

        <Typography>
          {item.quantity} x {item.price.toFixed(2)}€
        </Typography>
        <IconButton size="small" onClick={handleLike} disabled={loading} sx={{ ml: 1 }}>
          {liked ? <ThumbUpAltIcon color="primary" fontSize="small" /> : <ThumbUpAltOutlinedIcon fontSize="small" />}
        </IconButton>
      </Stack>
    </Box>
  );
};

export default OrderItem;
