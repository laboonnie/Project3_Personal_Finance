export default function BudgetTable({budgets}){
    return(
        <div className="card">
            <div className="card-body">
                <h5>Budget Progress</h5>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Jar</th>
                            <th>Budget</th>
                            <th>Spent</th>
                            <th>Remaining</th>
                        </tr>
                    </thead>
                    <tbody>
                        {budgets.map((b,index)=>(
                            <tr key={index}>
                                <td>{b.jar}</td>
                                <td>{b.budget.toLocaleString()}</td>
                                <td>{b.spent.toLocaleString()}</td>
                                <td>{b.remaining.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}