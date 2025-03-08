export const getUserId = (): string => {
    let userId = localStorage.getItem("userId");
  
    if (!userId) {
      userId = `guest-${Date.now()}`; // Générer un ID temporaire basé sur le timestamp
      localStorage.setItem("userId", userId);
    }
  
    return userId;
  };
  