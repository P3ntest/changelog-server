import { useEffect } from "react";

export function AuthButton() {
  useEffect(() => {
    if (!localStorage.getItem("auth")) {
      const authToken = prompt("Please enter the master auth token");
      if (authToken) {
        localStorage.setItem("auth", authToken);
      }
    }
  });

}
