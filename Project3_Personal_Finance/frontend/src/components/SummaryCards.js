import React from "react";
export default function SummaryCards({data}){
    return(
        <div className="row mb-4">
            <div className="col-md-3">
                <div className="card bg-success text-white">
                    <div className="card-body">
                        <h5>Total Income</h5>
                        <h3>{data.totalIncome}</h3>
                    </div>
                </div>
            </div>
            <div className="col-md-3">
                <div className="card bg-danger text-white">
                    <div className="card-body">
                        <h5>Total expense</h5>
                        <h3>{data.totalExpense} </h3>
                    </div>
                </div>
            </div>
            <div className="col-md-3">
                <div className="card bg-primary text-white">
                    <div className="card-body">
                        <h5>Net Balence</h5>
                        <h3>{data.netBalance} </h3>
                    </div>
                </div>
            </div>
            <div className="col-md-3">
                <div className="card bg-warning text-dark">
                    <div className="card-body">
                        <h5>Total Debt</h5>
                        <h3>{data.totalDebt} </h3>
                    </div>
                </div>
            </div>
        </div>
    )
}