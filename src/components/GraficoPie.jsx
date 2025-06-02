import React, { useEffect, useState } from "react";
import mondaySdk from "monday-sdk-js";
import ReactECharts from "echarts-for-react";
import "./graficoGauge.css";
import { AttentionBox, Dropdown } from "monday-ui-react-core";
import "monday-ui-react-core/tokens";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faTimes, faCog, faRefresh, faInfoCircle, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';

const monday = mondaySdk();

const GraficoPie = () => {
  const [boardId, setBoardId] = useState(null);
  const [data, setData] = useState([]); 
  const [columnId, setColumnId] = useState(null);
  const [timeFilter, setTimeFilter] = useState("ALL");
  const [boards, setBoards] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timelineColumns, setTimelineColumns] = useState([]);
  const [selectedColumn, setSelectedColumn] = useState(null);

  useEffect(() => {
    const fetchBoardId = async () => {
      const res = await monday.storage.getItem("selectedBoardId");
      if (res?.data?.value) {
        setBoardId(res.data.value);
      }

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
      fetchTimelineColumns();
    }
  }, [boardId]);

  useEffect(() => {
    if (selectedColumn) {
      setColumnId(selectedColumn.id);
    }
  }, [selectedColumn]);

  useEffect(() => {
    if (columnId) {
      fetchData(columnId);
    }
  }, [columnId, timeFilter]);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const handleRefresh = () => {
    setMenuOpen(false);
    if (columnId) {
      setLoading(true);
      fetchData(columnId).finally(() => setLoading(false));
    }
  };

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

  const fetchTimelineColumns = async () => {
    const query = `query {
      boards(ids: [${boardId}]) {
        columns {
          id
          title
          type
        }
      }
    }`;
    
    try {
      const res = await monday.api(query);
      const columns = res?.data?.boards[0]?.columns || [];
      const timelineCols = columns.filter(col => col.type === "timeline");
      
      setTimelineColumns(timelineCols);
      
      // Seleciona a primeira coluna timeline por padrão
      if (timelineCols.length > 0 && !selectedColumn) {
        setSelectedColumn(timelineCols[0]);
        setColumnId(timelineCols[0].id);
      }
    } catch (error) {
      console.error("Erro ao buscar colunas timeline:", error);
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
        { value: percentageOnTime, name: "Dentro do Prazo", itemStyle: { color: "#00c04b" } },
        { value: percentageOverdue, name: "Fora do Prazo", itemStyle: { color: "#FF2900" } }
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
      itemGap: 40,
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
          position: "outside",
          distance: 50,
          formatter: "{b} ({d}%)",
        },
        labelLine: {
          show: true,
          length: 25,
          length2: 15,
        },
        data: data
      }
    ]
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Menu Sanduíche */}
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000 }}>
        <button
          onClick={toggleMenu}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '20px',
            color: '#333',
            padding: '8px',
            borderRadius: '4px',
            transition: 'background-color 0.3s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <FontAwesomeIcon icon={menuOpen ? faTimes : faBars} />
        </button>

        {menuOpen && (
          <div style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '8px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
            minWidth: '250px',
            overflow: 'hidden',
            padding: '10px'
          }}>
            {/* Dropdown para seleção de coluna timeline */}
            <div style={{ marginBottom: '10px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                marginBottom: '5px',
                color: '#555',
                fontSize: '14px'
              }}>
                <FontAwesomeIcon icon={faCalendarAlt} />
                <span>Coluna Timeline:</span>
              </div>
              <select
                value={selectedColumn?.id || ''}
                onChange={(e) => {
                  const selected = timelineColumns.find(col => col.id === e.target.value);
                  setSelectedColumn(selected);
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              >
                {timelineColumns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Conteúdo Principal */}
      <div style={{ width: "100%", height: "100%", paddingTop: '40px' }}>
        {loading ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            color: '#555'
          }}>
            Carregando...
          </div>
        ) : columnId ? (
          <ReactECharts 
            option={option} 
            style={{ width: "100%", height: "100%" }} 
          />
        ) : (
          <AttentionBox
            title="Informações sobre o widget"
            text={timelineColumns.length === 0 
              ? "Nenhuma coluna do tipo 'timeline' encontrada no quadro selecionado." 
              : "Selecione uma coluna timeline no menu acima."}
            type="Warning"
          />
        )}
      </div>
    </div>
  );
};

export default GraficoPie;