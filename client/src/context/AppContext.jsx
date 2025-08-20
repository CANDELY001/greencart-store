import { useNavigate } from "react-router-dom";
import { useState, createContext, useContext } from "react";
export const AppContext = createContext();
export const AppContextProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isSeller, setIsSeller] = useState(false);
  const [showUserLogin, setShowUserLogin] = useState(false);
  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        isSeller,
        setIsSeller,
        navigate,
        showUserLogin,
        setShowUserLogin,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  return useContext(AppContext);
};
