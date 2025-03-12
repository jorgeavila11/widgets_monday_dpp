import React, { useEffect, useState } from "react";
import mondaySdk from "monday-sdk-js";
import ReactECharts from "echarts-for-react";
import "./graficoGauge.css";
import { AttentionBox} from "monday-ui-react-core";
import "monday-ui-react-core/tokens";

const monday = mondaySdk();

const graficoPie = () => {
  const [boardId, setBoardId] = useState(null);
  const [data, setData] = useState([]); 
  const [columnId, setColumnId] = useState(null);
  const [timeFilter, setTimeFilter] = useState("ALL");
  const [boards, setBoards] = useState([]);

  useEffect(() => {
    // Tenta recuperar o boardId do armazenamento interno do Monday.com
    const fetchBoardId = async () => {
      const res = await monday.storage.getItem("selectedBoardId");
      if (res?.data?.value) {
        setBoardId(res.data.value);
      }

      // Captura mudanças no contexto do Monday.com
      monday.listen("context", (res) => {
        if (res?.data?.boardId) {
          setBoardId(res.data.boardId);
          monday.storage.setItem("selectedBoardId", res.data.boardId);
        }
      });
    };

    fetchBoardId();
    fetchBoards();
  }, []);

  useEffect(() => {
    if (boardId) {
      fetchTimelineColumnId();
    }
  }, [boardId]);

  useEffect(() => {
    if (columnId) {
      fetchData(columnId);
    }
  }, [columnId, timeFilter]);

  const fetchBoards = async () => {
    const query = `query { boards { id name } }`;
    try {
      const res = await monday.api(query);
      if (res?.data?.boards) {
        setBoards(res.data.boards);
      }
    } catch (error) {
      console.error("Erro ao buscar boards:", error);
    }
  };

  const fetchTimelineColumnId = async () => {
    const query = `query { boards(ids: [${boardId}]) { items_page { items { column_values { id type } } } } }`;
    try {
      const res = await monday.api(query);
      const timelineColumn = res?.data?.boards[0]?.items_page?.items[0]?.column_values.find(col => col.type === "timeline");
      if (timelineColumn) {
        setColumnId(timelineColumn.id);
      } else {
        setColumnId(null);
      }
    } catch (error) {
      console.error("Erro ao buscar ID da coluna timeline:", error);
    }
  };

  const fetchData = async (columnId) => {
    try {
      const overdueQuery = `query { boards(ids: [${boardId}]) { items_page(query_params: {rules: [{column_id: \"${columnId}\", compare_value: [\"DONE_OVERDUE\"], operator: any_of}]}) { items { id } } } }`;
      const onTimeQuery = `query { boards(ids: [${boardId}]) { items_page(query_params: {rules: [{column_id: \"${columnId}\", compare_value: [\"DONE_ON_TIME\"], operator: any_of}]}) { items { id } } } }`;
      
      const overdueResponse = await monday.api(overdueQuery);
      const onTimeResponse = await monday.api(onTimeQuery);

      const overdueCount = overdueResponse?.data?.boards[0]?.items_page?.items.length || 0;
      const onTimeCount = onTimeResponse?.data?.boards[0]?.items_page?.items.length || 0;

      const total = overdueCount + onTimeCount;
      const percentageOverdue = total > 0 ? ((overdueCount / total) * 100).toFixed(0) : 0;
      const percentageOnTime = total > 0 ? ((onTimeCount / total) * 100).toFixed(0) : 0;

      setData([
        { value: percentageOnTime, name:  " Dentro do Prazo", itemStyle: { color: "#00c04b" } },
        { value: percentageOverdue, name:  " Fora do Prazo", itemStyle: { color: "#FF2900" } }
      ]);
    } catch (error) {
      console.error("Erro ao buscar dados da coluna timeline:", error);
    }
  };

  const option = {
    tooltip: {
      trigger: "item"
    },
    legend: {
      top: "5%",
      left: "center",
      itemGap: 40,  // Aumenta a separação entre os itens da legenda
    },
    series: [
      {
        name: "Status do Projeto",
        type: "pie",
        radius: ["50%", "80%"],
        center: ["50%", "70%"],
        startAngle: 180,
        endAngle: 360,
        label: {
          show: true,
          position: "outside",  // Garante que as labels fiquem fora das fatias
          distance: 50,         // Aumenta a separação das labels
          formatter: "{b} ({d}%)", // Mostra o nome e a porcentagem
        },
        labelLine: {
          show: true,
          length: 25, // Aumenta o comprimento da linha da label
          length2: 15,
        },
        data: data
      }
    ]
  };

  return (
    <div className="container">
      <div className="menu-container">       
      </div>
      <div className="chart-container" style={{ width: "100%", height: "400px" }}>
        {columnId ? (
          <ReactECharts option={option} className="pie-chart" style={{ width: "100%", height: "100%" }} />
        ) : (
          <AttentionBox
            title="Informações sobre o widget"
            text="Nenhuma coluna do tipo 'timeline' encontrada no quadro selecionado."
            type="Warning"
          />
        )}
      </div>
    </div>
  );
};

export default graficoPie;
