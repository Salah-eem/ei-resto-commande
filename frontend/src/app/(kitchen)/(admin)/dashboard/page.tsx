// DashboardPage.tsx
'use client';

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import api from "@/lib/api";
import ProtectRoute from "@/components/ProtectRoute";
import { Role } from "@/types/user";

interface DashboardStats {
  todayOrders: number;
  todayRevenue: number;
  pendingOrders: number;
  monthOrders: number;
  monthRevenue: number;
  totalClients: number;
  newClientsThisMonth: number;
}

interface HistoryPoint {
  date: string;
  value: number;
}

const metricOptions: { key: keyof DashboardStats; label: string; color: string }[] = [
  { key: "todayOrders",       label: "Today's Orders",      color: "#1976d2" },
  { key: "todayRevenue",      label: "Today's Revenue",     color: "#43a047" },
  { key: "pendingOrders",     label: "Pending Orders",      color: "#ffa000" },
  { key: "monthOrders",       label: "Orders This Month",   color: "#0288d1" },
  { key: "monthRevenue",      label: "Revenue This Month",  color: "#388e3c" },
  { key: "totalClients",      label: "Total Clients",       color: "#6d4c41" },
  { key: "newClientsThisMonth", label: "New Clients",       color: "#c2185b" },
];

export default function DashboardPage() {
  const [stats, setStats]           = useState<DashboardStats | null>(null);
  const [loadingStats, setLoading]  = useState(true);
  const [errorStats, setError]      = useState<string | null>(null);

  const [selectedMetric, setMetric] = useState<keyof DashboardStats>("todayOrders");
  const [history, setHistory]       = useState<HistoryPoint[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const [errorHist, setErrorHist]     = useState<string | null>(null);

  // 1) Global loading of stats
  useEffect(() => {
    api.get<DashboardStats>("/restaurant/dashboard")
      .then(res => setStats(res.data))
      .catch(() => setError("Failed to load statistics"))
      .finally(() => setLoading(false));
  }, []);

  // 2) Load history on metric change
  useEffect(() => {
    setLoadingHist(true);
    setErrorHist(null);
    api.get<HistoryPoint[]>("/restaurant/dashboard/history", {
      params: { metric: selectedMetric }
    })
      .then(res => setHistory(res.data))
      .catch(() => setErrorHist("Failed to load history"))
      .finally(() => setLoadingHist(false));
  }, [selectedMetric]);

  if (loadingStats) {
    return (
      <Box textAlign="center" mt={8}>
        <CircularProgress size={60} />
      </Box>
    );
  }
  if (errorStats || !stats) {
    return (
      <Box p={4}>
        <Alert severity="error">{errorStats}</Alert>
      </Box>
    );
  }

  // Find selected metric config
  const metricConfig = metricOptions.find(m => m.key === selectedMetric)!;

  return (
    <ProtectRoute allowedRoles={[Role.Admin]}>
      <Box
        sx={{
          mt: 4,
          px: { xs: 2, md: 4 },
          background: 'linear-gradient(160deg, #f0f4f8 0%, #d9e2ec 100%)',
          minHeight: '100vh'
        }}
      >
        <Typography variant="h3" fontWeight={700} gutterBottom>
          Restaurant Overview
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" mb={3}>
          Key statistics in real time
        </Typography>        {/* Metric selector */}
        <FormControl sx={{ mb: 4, minWidth: { xs: '100%', sm: 220 } }}>
          <InputLabel id="metric-select-label">Statistic</InputLabel>
          <Select
            labelId="metric-select-label"
            label="Statistic"
            value={selectedMetric}
            onChange={e => setMetric(e.target.value as keyof DashboardStats)}
          >
            {metricOptions.map(opt => (
              <MenuItem key={opt.key} value={opt.key}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* History chart */}
        <Paper sx={{ p: 3, mb: 4, boxShadow: 3 }}>
          <Typography variant="h6" mb={2} color={metricConfig.color}>
            History: {metricConfig.label}
          </Typography>

          {loadingHist ? (
            <Box textAlign="center" py={6}>
              <CircularProgress />
            </Box>
          ) : errorHist ? (
            <Alert severity="error">{errorHist}</Alert>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={history}>
                <CartesianGrid stroke="#ccc" strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} />
                <YAxis />
                <Tooltip formatter={(value: any) =>
                  typeof value === 'number'
                    ? metricConfig.key.toLowerCase().includes('revenue')
                      ? `${value.toLocaleString()} €`
                      : value
                    : value
                } />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={metricConfig.color}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Paper>

        {/* Summary cards */}
        <Grid container spacing={3}>
          {metricOptions.map(c => (
            <Grid item xs={12} sm={6} md={4} key={c.key}>
              <Paper
                sx={{
                  p: 3,
                  position: 'relative',
                  borderRadius: 2,
                  boxShadow: 3,
                  '&:hover': { boxShadow: 6 },
                }}
              >
                <Box display="flex" alignItems="center" mb={1}>
                  <Box
                    sx={{
                      bgcolor: c.color,
                      mr: 1.5,
                      p: 1,
                      borderRadius: 1,
                      color: '#fff',
                    }}
                  >
                    {/* placeholder icon */}
                    <Typography variant="subtitle2">{c.label.charAt(0)}</Typography>
                  </Box>
                  <Typography variant="subtitle1" sx={{ color: c.color, fontWeight: 600 }}>
                    {c.label}
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {(() => {
                    const v = stats[c.key as keyof DashboardStats] as any;
                    return typeof v === 'number' ? v.toLocaleString() : v;
                  })()}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    </ProtectRoute>
  );
}
