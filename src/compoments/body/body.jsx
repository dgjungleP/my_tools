import React, { useState, useEffect } from "react";
import { DatePicker, Switch, Select, Row, Col, Spin } from "antd";
import "antd/dist/antd.css";
import "./body.css";
import { Gantt } from "../gantt/gant";
import { getProject } from "../../server/project-service";
import moment from "moment";
const { Option } = Select;
const yearMonthFormatt = "yyyy-MM";
const groups = ["website", "b2b", "mobile"];
const selectors = [
  "None",
  "Shrek",
  "Iris",
  "Tina",
  "Yiting",
  "Vic",
  "Cyson",
  "Cindy",
  "Yeva",
  "Cheryl",
  "Winnie",
  "Lillian",
];
function ScheduleBody(props) {
  const date = new Date();
  const [query, updateQuery] = useState({
    history: false,
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    group: groups,
  });

  const [showGantt, setShowGant] = useState(false);
  const [tableData, updateTableData] = useState([]);
  const [ganttTableData, updateganttTableData] = useState([]);
  const [loading, updateLoading] = useState(false);
  const [simple, updateSimple] = useState(false);
  const chanegQuery = (parmas) => {
    const newQuery = JSON.parse(JSON.stringify(query));
    Object.assign(newQuery, parmas);
    newQuery.history = moment(new Date()).isAfter(
      newQuery.year + "-" + newQuery.month + "-01",
      "month"
    );
    updateQuery(newQuery);
    freashData(newQuery);
  };
  const freashData = (query) => {
    updateLoading(true);
    query = query ? query : {};
    if (check(query)) {
      getProject(query)
        .then((response) => {
          setShowGant(true);
          flushDate(response.data, query);
        })
        .catch(() => {
          setShowGant(false);
          updateLoading(false);
        });
    } else {
      setShowGant(false);
      updateLoading(false);
    }
  };
  const chanDage = (newTableData, currentQuery) => {
    currentQuery = currentQuery ? currentQuery : query;
    updateLoading(true);
    const newGanttData = makeGanttTableData(
      groupData(newTableData, currentQuery.year, currentQuery.month),
      currentQuery.month,
      currentQuery.year
    );
    updateganttTableData(newGanttData);
    updateTableData(newTableData);
    updateLoading(false);
  };
  const flushDate = (responseData, query) => {
    const newTableData = makeData(responseData);
    chanDage(newTableData, query);
  };
  useEffect(() => {
    freashData(query);
  }, []);
  return (
    <>
      <Header
        onQueryChange={chanegQuery}
        query={query}
        onSimpleChange={updateSimple}
      ></Header>
      <Spin spinning={loading}>
        <Gantt
          query={query}
          showGantt={showGantt}
          tableData={tableData}
          ganttTableData={ganttTableData}
          updateData={chanDage}
          selectors={selectors}
          simple={simple}
        ></Gantt>
      </Spin>
    </>
  );
}

function Header(props) {
  const query = props.query;

  const [time, updateTime] = useState({ year: query.year, month: query.month });
  const [group, updateGroup] = useState([...query.group]);
  const [simple, updatSimple] = useState(false);
  const onTimeChange = (_, dateString) => {
    const newTime = JSON.parse(JSON.stringify(time));
    newTime.year = parseInt(dateString.split("-")[0]);
    newTime.month = parseInt(dateString.split("-")[1]);
    updateTime(newTime);
    props.onQueryChange(newTime);
  };
  const onHistoryChange = () => {
    props.onSimpleChange(!simple);
    updatSimple(!simple);
    props.onQueryChange({ simple: !simple });
  };
  const onGroupChange = (value) => {
    updateGroup(value);
    props.onQueryChange({ group: value });
  };
  return (
    <>
      <Row
        gutter={15}
        justify="center"
        style={{ marginTop: 10 }}
        align="center"
      >
        <Col>
          <span>Time:</span>{" "}
          <DatePicker
            defaultValue={moment(
              time.year + "-" + time.month,
              yearMonthFormatt
            )}
            onChange={onTimeChange}
            picker="month"
          />
        </Col>
        <Col>
          <span>Group:</span>{" "}
          <Select
            defaultValue={group}
            style={{ width: 500 }}
            onChange={onGroupChange}
            mode="multiple"
          >
            {groups.map((data) => {
              return (
                <Option value={data} key={data}>
                  {data}
                </Option>
              );
            })}
          </Select>
        </Col>
        <Col>
          <span>Simple:</span>{" "}
          <Switch checked={simple} onChange={onHistoryChange} />
        </Col>
      </Row>
    </>
  );
}

//Method
function check(query) {
  return (
    Number.isInteger(query.year) &&
    Number.isInteger(query.month) &&
    query.history != undefined &&
    query.group != undefined
  );
}
function getDays(year, month) {
  month = parseInt(month, 10);
  var d = new Date(year, month, 0);
  return d.getDate();
}
function groupData(tableData, year, month) {
  const result = selectors.map((data) => ({ name: data, dataList: [] }));
  const groupData = tableData.flatMap((data) =>
    data.tester.split(",").map((testerData) => {
      const newData = {};
      Object.assign(newData, data);
      newData.tester = testerData;
      return newData;
    })
  );
  groupData
    .filter((data) => data.tester && data.tester != "None")
    .forEach((data) => {
      const item = { name: data.tester };
      let tag = true;
      for (const resultItem of result) {
        if (resultItem.name == item.name) {
          const timeWindow = resultItem.dataList.map((dataItem) => {
            return getTime(dataItem, month, year);
          });
          const time = getTime(data, month, year);
          if (
            checkTime(timeWindow, time.start, time.end) ||
            resultItem.dataList.length == 0
          ) {
            resultItem.dataList.push(data);
            tag = false;
            break;
          }
        }
      }
      if (tag) {
        item.dataList = [data];
        result.push(item);
      }
    });
  for (const item of result) {
    item.dataList.sort((l, r) => {
      return l.releaseDay > r.releaseDay ? -1 : 1;
    });
  }
  return result;
}
function getTime(dataItem, month, year) {
  let start = getDateNumber(dataItem.releaseDay);
  let end = getDateNumber(dataItem.launchDay);
  if (
    getMothNumber(dataItem.releaseDay) < parseInt(month) ||
    getYearNumber(dataItem.releaseDay) < parseInt(year)
  ) {
    start = 1;
  }
  if (
    getMothNumber(dataItem.launchDay) > parseInt(month) ||
    getYearNumber(dataItem.launchDay) > parseInt(year)
  ) {
    end = getDays(year, month) + 1;
  }
  return { start, end };
}

function makeGanttTableData(tableDataGroup, month, year) {
  const ganttTableData = [];
  tableDataGroup
    .filter((data) => data.name && data.name != "None")
    .sort((l, r) => {
      if (l.name > r.name) {
        return -1;
      }
      return 1;
    })
    .forEach((data, index) => {
      const result = { key: index, rowSpan: 1, missCol: [], dayCount: 0 };
      result.name = data.name;
      makeLine(data.dataList, result, month, year);
      if (
        ganttTableData[index - 1] &&
        ganttTableData[index - 1].name == result.name
      ) {
        result.pre = ganttTableData[index - 1].pre;
        if (result.pre == undefined) {
          result.pre = index - 1;
        }
        result.miss = true;
        ganttTableData[result.pre].rowSpan += 1;
        ganttTableData[result.pre].dayCount += result.dayCount;
      }
      ganttTableData.push(result);
    });
  return ganttTableData;
}
function checkTime(timeWindow, start, end) {
  const timeArray = [];
  timeWindow.forEach((time) => {
    for (let i = time.start; i <= time.end; i++) {
      timeArray.push(i);
    }
  });
  timeArray.sort((l, r) => l - r);
  const result =
    timeArray.findIndex((data) => data == start) < 0 &&
    timeArray.findIndex((data) => data == end) < 0 &&
    (start > timeArray[timeArray.length - 1] || end < timeArray[0]);
  return result;
}
function getDateNumber(time) {
  return parseInt(time.split("-")[2]);
}
function getYearNumber(time) {
  return parseInt(time.split("-")[0]);
}
function getMothNumber(time) {
  return parseInt(time.split("-")[1]);
}
function makeLine(dataList, result, month, year) {
  dataList.forEach((data) => {
    const missCol = [];
    const { start, end } = getTime(data, month, year);
    for (let i = start + 1; i < end; i++) {
      missCol.push(i);
    }
    result[start] = data.project + "-Release-" + (end - start);
    result[end] = data.project + "-Launch-1";
    missCol.forEach((item) => {
      result.missCol.push(item);
    });
    result.dayCount += end - start + 1;
  });
}

function makeData(json) {
  const result = [];
  let count = 0;
  for (const item of json) {
    const base = {};
    base.project = item.projectNumber;
    base.crl_pb = item.pb[0].link;
    base.version = item.pb[0].versionId;
    base.status = item.status;
    base.projectName = item.pb[0].projectName;
    // base.tester = count % 2 == 0 ? "Tina" : "Vic";
    base.tester = item.tester;
    base.releaseDay = item.releaseDate;
    base.launchDay = item.launchDate;
    base.key = base.project + base.version;
    result.push(base);
    count++;
  }
  return result;
}

export { ScheduleBody };
