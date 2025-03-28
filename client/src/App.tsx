import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from "chart.js"
import { Line } from "react-chartjs-2"
import { useEffect, useRef, useState } from "react"
import "chartjs-adapter-luxon"
import { DateTime } from "luxon"

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
)

// TODO: can lose / infer this

type DataLabel =
  | "All NYC"
  | "Richmond"
  | "Queens"
  | "Kings"
  | "Bronx"
  | "Manhattan"

// TODO: do I have nyc_percentile and New York w percentile flipped?
const labelsMap = {
  NYC_percentile: "All NYC",
  Richmond_w_percentile: "Richmond",
  Queens_w_percentile: "Queens",
  Kings_w_percentile: "Kings",
  Bronx_w_percentile: "Bronx",
  "New York_w_percentile": "Manhattan",
} as const

type Watersheds = keyof typeof labelsMap

const colorsMap: Record<DataLabel, string> = {
  "All NYC": "#20104d",
  Richmond: "#70ff50",
  Queens: "#507fff",
  Kings: "#ff5050",
  Bronx: "#bc50ff",
  Manhattan: "#fff950",
}

// TODO: type data
const LineChart = ({ data }: { data: any | null }) => {
  const chartRef = useRef<ChartJS | null>(null)
  const [selectedData, setSelectedData] = useState<DataLabel>("All Watersheds")
  const [hoverData, setHoverData] = useState<DataLabel | null>(null)
  console.log({ selectedData })

  useEffect(() => {
    const selected = hoverData ?? selectedData
    chartRef.current?.data.datasets.forEach((dataset) => {
      const isSelected = dataset.label !== selected
      const color = `${colorsMap[dataset.label!]}${isSelected ? "10" : ""}`
      // dataset.backgroundColor = color
      dataset.borderColor = color
    })

    chartRef.current?.update()
  }, [selectedData, hoverData])

  // TODO: take out this loading delay
  if (!data) {
    return null
  }

  return (
    <SquareContainer>
      <div className="p-4">
        <Line
          ref={chartRef}
          data={data}
          options={{
            animation: {
              duration: 500,
            },
            plugins: {
              legend: {
                // TODO: why doesn't this go back to normal when you leave?
                onHover: (evt, item) => {
                  // @ts-ignore
                  evt.native.target.style.cursor = "pointer"
                  console.log({ evt })
                  const label = item.text as DataLabel
                  setHoverData(label)
                },
                onLeave: (evt) => {
                  console.log("ON LEAVE")
                  // @ts-ignore
                  evt.native.target.style.cursor = "cursor"
                  setHoverData(null)
                },
                onClick: (_, item) => {
                  const label = item.text as DataLabel
                  setSelectedData(label)
                },
              },
            },
            scales: {
              y: {
                min: 0,
                max: 100,
              },
              x: {
                type: "time",
                time: {
                  unit: "month",
                },
                grid: {
                  display: false,
                },
              },
            },
          }}
        />
      </div>
    </SquareContainer>
  )
}

const SquareContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative mr-2">
      <div className="z-10 relative border-4 bg-secondary border-tertiary">
        {children}
      </div>
      <div className="z-1 absolute top-2 left-2 -right-2 -bottom-2 bg-tertiary" />
    </div>
  )
}

const Header = () => {
  return (
    <div className="text-7xl uppercase">
      <h1 className="underline">New York City</h1>
      <h1>
        Covid <span className="text-blue-500">Waste-water</span> tracker
      </h1>
    </div>
  )
}

type BackendResponse = {
  [K in Watersheds]: { [id: number]: number | null }
} & {
  test_date: {
    [id: number]: string
  }
}

const OUTPUT_URL = "https://dzxpc6d4t7c55.cloudfront.net/output.json"
const fetchCovidData = async () => {
  const res = await fetch(OUTPUT_URL)
  const wastewaterData: BackendResponse = await res.json()
  return wastewaterData
}

const createGraphData = (data: BackendResponse) => {
  const labels = Object.values(data.test_date)
  const datasets = Object.entries(data)
    .filter(([k]) => k !== "test_date")
    .map(([k, v]) => {
      const label = labelsMap[k]
      const data = Object.values(v)
      const color = colorsMap[label]
      return {
        label,
        borderColor: color,
        backgroundColor: color,
        pointStyle: false,
        cubicInterpolationMode: "default",
        tension: 0.01,
        data,
      }
    })

  return {
    labels,
    // Looks like:
    // datasets: [
    //   {
    //     label: "My First dataset",
    //     backgroundColor: "rgb(255, 99, 132)",
    //     borderColor: "rgb(255, 99, 132)",
    //     data: [0, 10, 5, 2, 20, 30, 45],
    //   },
    // ],
    datasets,
  }
}

type CovidSummaryType = {
  percentile: number
  trend: "up" | "down"
  lastUpdated: DateTime
  data: ReturnType<typeof createGraphData>
}

const createCovidSummary = async (): Promise<CovidSummaryType> => {
  const wastewaterData = await fetchCovidData()
  const graphData = createGraphData(wastewaterData)
  const nycPercentile = wastewaterData["NYC_percentile"]
  console.log({ wastewaterData })
  // TODO: fix this shitty typing

  // Get percentile
  const mostRecentValuedDay = Object.keys(nycPercentile)
    .sort((a, b) => Number(b) - Number(a))
    .find((k) => nycPercentile[Number(k)] != null) as unknown as number

  const percentile = nycPercentile[mostRecentValuedDay] as number

  // Get last updated

  const lastUpdated = DateTime.fromISO(
    wastewaterData["test_date"][mostRecentValuedDay],
  )

  // Get trend (TODO: do this from backend w a regression probs)
  // Super hacky and doesn't deal with if that day doesn't have a value, yikes
  const twoWeeksAgoVal = nycPercentile[mostRecentValuedDay - 14] as number

  // TODO: we should have a 'flat' trend here
  const trend = twoWeeksAgoVal < percentile ? "up" : "down"

  return {
    percentile, // TODO: fix this type
    trend,
    lastUpdated: lastUpdated, // TODO
    data: graphData,
  }
}

const useCovidData = () => {
  const [summary, setSummary] = useState<CovidSummaryType | null>(null)

  useEffect(() => {
    const task = async () => {
      const summary = await createCovidSummary()
      setSummary(summary)
    }
    task()
  }, [])

  return summary
}

const AtAGlance = ({ summary }: { summary: CovidSummaryType | null }) => {
  // TODO: is there a more tailwindy way to do this?
  // TODO: need to wire this up. Classnames?
  // const percentileColor = summary?.percentile
  //   ? summary.percentile > 60
  //     ? "text-rose-600"
  //     : "text-green-400"
  //   : ""

  return (
    <div>
      <h2>At a glance:</h2>
      <SquareContainer>
        {summary ? (
          <div className="p-12">
            <ul>
              <li>
                – The current Covid Percentile is{" "}
                <span className="text-rose-600">
                  {summary.percentile.toFixed(1)} out of 100.{" "}
                </span>
                <a className="text-gray-400 hover:underline" href="#">
                  (what's this?)
                </a>
              </li>
              <li>
                – Covid rates over the last two weeks are trending{" "}
                <span className="text-rose-600">
                  {summary.trend === "up" ? "up" : "down"}.
                </span>
              </li>
            </ul>
          </div>
        ) : (
          "loading"
        )}
        {summary ? (
          <div className="absolute right-4 bottom-4 text-black/30">
            Last updated: {summary?.lastUpdated.toISODate()}
          </div>
        ) : null}
      </SquareContainer>
    </div>
  )
}

const FAQItems = [
  [
    "Wasterwater?",
    "Wastewater testing measures the amount of coronavirus shed in stool, when people go to the bathroom. Now that most cities aren't collecting COVID test results, wastewater is the most reliable source for measuring the number of people in a region who currently have COVID. This [photo essay](https://www.nytimes.com/interactive/2022/08/17/health/wastewater-polio-covid-nyc.html) shows the testing process in an NYC Hospital. ",
  ],
  [
    "Where is this data from?",
    "All data on this website is publicly available – new wastewater data is from the [CDC](https://covid.cdc.gov/covid-data-tracker/#wastewater-surveillance), and historical data is from [NYC Open Data](https://data.cityofnewyork.us/Health/SARS-CoV-2-concentrations-measured-in-NYC-Wastewat/f7dc-2q9f/data).",
  ],
  [
    "Why not just look at the CDC Website?",
    "We are technical professionals, who had trouble getting a line graph out of the CDC website. If they make it easier, we will shut down this site.",
  ],
  [
    "Why should I care about this?",
    "You don’t have to! While everyone has different risks and considerations, we should all have access to simple, high quality, accurate information for decision making. That’s the goal of this page.",
  ],
  [
    "Why don’t the values match the NYS Wastewatcher dashboard?",
    "NYS is applying linear adjustment to match prior values – do this adjustment (add) to reproduce those values <not applicable if data is perc only, which NYS doesn’t offer>",
  ],
  ["How does this work?", "You can see the code here"],
  ["When will this be available in my city?", "<idk>"],
]

const SideBar = () => {
  return (
    <div className="h-[540px] border-r-4 border-dashed flex flex-col flex-1 border-tertiary/50">
      <a href="#FAQ">FAQ</a>
      <a href="">TWITTER</a>
      <a href="">GITHUB</a>
    </div>
  )
}

const MainContent = () => {
  const summary = useCovidData()

  return (
    <div className="max-w-4xl flex flex-col gap-16 mx-20">
      <AtAGlance summary={summary} />
      <LineChart data={summary?.data} />
      <div>
        <h2>Suggestions</h2>
        <p>Based on this data, here are some ideas to reduce your risk:</p>
        <ul>
          <li>– Idea 1</li>
          <li>– Idea 2</li>
          <li>– Idea 3</li>
        </ul>
      </div>
      <div id="FAQ">
        <h2>FAQ</h2>
        {FAQItems.map(([q, a], i) => (
          <p key={i}>
            <h3>{q}</h3>
            {a}
          </p>
        ))}
      </div>
    </div>
  )
}

const App = () => {
  return (
    <div className="bg-background min-h-screen p-10">
      <div className="mb-16">
        <Header />
      </div>
      <div className="w-100 flex">
        <SideBar />
        <MainContent />
        <div className="flex-1" />
      </div>
    </div>
  )
}

export default App
