export default function GoalTable({goals}){
    return(
        <div className="card">
            <div className="card-body">
                <h5>Goals Progress</h5>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Goal</th>
                            <th>Target</th>
                            <th>Current</th>
                            <th>Progress</th>
                        </tr>
                    </thead>
                    <tbody>
                        {goals.map(g=>{
                            const percent = (g.currentAmount/g.targetAmount)*100;
                            return(
                                <tr key={g.id}>
                                    <td>{g.goalName}</td>
                                    <td>{g.targetAmount}</td>
                                    <td>{g.currentAmount}</td>
                                    <td>
                                        <div className="progress">
                                            <div className="progress-bar" style={{with:percent+"%"}}>{percent.toFixed(0)}%</div>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}