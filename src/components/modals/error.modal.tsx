import { exportTraceState } from "next/dist/trace";

interface ErrorModalProps {
    updateCloseState: React.Dispatch<React.SetStateAction<boolean>>;
    children: React.ReactNode;
}

const ErrorModal = (props: ErrorModalProps) => {
    const { updateCloseState, children } = props;

    return (
        <div className="fixed w-screen h-screen top-0 left-0 flex justify-center items-center bg-[rgba(0,0,0,0.5)] z-50">
            <div className="relative rounded-lg shadow-sm bg-zinc-900 w-max px-15">
                { /* Close Button */ }
                <button onClick={() => updateCloseState(false)} type="button" className="cursor-pointer absolute top-3 end-2.5 text-gray-400 bg-transparent hover:text-zinc-100 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center" data-modal-hide="popup-modal">
                    <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                    </svg>
                </button>
                <div className="p-4 md:p-5 text-center">
                    { /* Warning Icon */ }
                    <svg className="mx-auto mb-4 text-red-400 w-12 h-12" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 11V6m0 8h.01M19 10a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    { /* Message Text */ }
                    <h3 className="mb-5 text-lg font-normal text-zinc-100">{children}</h3>
                    { /* Accept Button */ }
                    <button onClick={()=>updateCloseState(false)} data-modal-hide="popup-modal" type="button" className="cursor-pointer text-white bg-red-500 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 font-bold rounded-lg text-sm inline-flex items-center px-5 py-2.5 text-center">
                        Aceptar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ErrorModal;