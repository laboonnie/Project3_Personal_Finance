import "./modal.css";

export default function Modal({children,close}){

    return(

        <div className="modal-overlay">

            <div className="modal-box">

                <button
                    className="close-btn"
                    onClick={close}
                >
                    ✖
                </button>

                {children}

            </div>

        </div>

    )

}