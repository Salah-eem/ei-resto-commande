import { useAppDispatch, useAppSelector } from '../store';
import { useCallback } from 'react';
import { 
  startDelivery, 
  updatePosition, 
  completeDelivery,
  setCurrentPosition,
  clearRoute,
  setEstimatedArrival,
  setDistance
} from '../store/slices/deliverySlice';

export const useDelivery = () => {
  const dispatch = useAppDispatch();
  const { 
    isDelivering, 
    currentPosition, 
    deliveryRoute, 
    estimatedArrival, 
    distance, 
    loading, 
    error 
  } = useAppSelector((state) => state.delivery);

  const start = useCallback((orderId: string) => {
    return dispatch(startDelivery(orderId));
  }, [dispatch]);

  const complete = useCallback((orderId: string) => {
    return dispatch(completeDelivery(orderId));
  }, [dispatch]);

  const updateCurrentPosition = useCallback((position: any) => {
    dispatch(setCurrentPosition(position));
    return dispatch(updatePosition(position));
  }, [dispatch]);

  const clearDeliveryRoute = useCallback(() => {
    dispatch(clearRoute());
  }, [dispatch]);

  const setETA = useCallback((eta: number) => {
    dispatch(setEstimatedArrival(eta));
  }, [dispatch]);

  const setDeliveryDistance = useCallback((dist: number) => {
    dispatch(setDistance(dist));
  }, [dispatch]);

  return {
    isDelivering,
    currentPosition,
    deliveryRoute,
    estimatedArrival,
    distance,
    loading,
    error,
    start,
    complete,
    updateCurrentPosition,
    clearDeliveryRoute,
    setETA,
    setDeliveryDistance,
  };
};
