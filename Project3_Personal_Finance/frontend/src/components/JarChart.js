import { Pie } from "react-chartjs-2";

export default function JarChart({data}){
    const chartData={
        labels:data.map(x=>x.jarName),
        datasets:[
            {
                data:data.map(x=>x.amout),
                backgroundColor:[
                    "#FF6384",
                    "#36A2EB",
                    "#FFCE56",
                    "#4CAF50",
                    "#9966FF",
                    "#FF9F40"
                ]
            }
        ]
    }
    return(
        <div className="card">
            <div className="card-body">
                <h5>Spending by Financial Jar</h5>
                <Pie data={chartData}/>
            </div>
        </div>
    )
}