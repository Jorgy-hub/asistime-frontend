import { useEffect, useState } from "react";

const Loading = () => {
    const [isLoading, setIsLoading] = useState(true);

    const handleLoading = () => {
        setIsLoading(false);
    }

    useEffect(() => {
        window.addEventListener("load", handleLoading);
        return () => 
            window.removeEventListener("load", handleLoading);
    }, []);

    return !isLoading && (
        <div className="flex justify-center items-center h-screen w-screen text-white absolute top-0 left-0 bg-zinc-800">
            Loading...
        </div>
    )
}

export default Loading;