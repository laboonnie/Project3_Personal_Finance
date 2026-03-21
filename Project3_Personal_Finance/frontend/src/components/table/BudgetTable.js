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
                        {budgets.map(b=>(
                            <tr key={b.id}>
                                <td>{b.jar}</td>
                                <td>{b.budget}</td>
                                <td>{b.spent}</td>
                                <td>{b.remaining}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}