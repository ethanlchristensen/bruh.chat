# streamlit_app.py
import streamlit as st
import sqlite3
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta

# Page config
st.set_page_config(
    page_title="AI Cost Explorer",
    page_icon="💰",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Database connection
@st.cache_resource
def get_connection():
    return sqlite3.connect('db/db.sqlite3', check_same_thread=False)

@st.cache_data(ttl=60)
def load_data():
    conn = get_connection()
    query = """
    SELECT 
        id,
        provider,
        model_used,
        finish_reason,
        prompt_tokens,
        completion_tokens,
        image_tokens,
        reasoning_tokens,
        total_tokens,
        estimated_prompt_cost,
        estimated_completion_cost,
        estimated_reasoning_cost,
        upstream_inference_cost,
        upstream_inference_prompt_cost,
        upstream_inference_completions_cost,
        cost,
        created_at,
        is_structured_output,
        request_id
    FROM api_airesponse
    ORDER BY created_at DESC
    """
    df = pd.read_sql_query(query, conn)
    df['created_at'] = pd.to_datetime(df['created_at'])
    return df

# Load data
try:
    df = load_data()
    
    if df.empty:
        st.warning("No data found in the database.")
        st.stop()
        
except Exception as e:
    st.error(f"Error loading data: {e}")
    st.stop()

# Title
st.title("💰 AI Response Cost Explorer")
st.markdown("---")

# Sidebar filters
st.sidebar.header("🔍 Filters")

# Provider filter
providers = ['All'] + sorted(df['provider'].dropna().unique().tolist())
selected_provider = st.sidebar.selectbox("Provider", providers)

# Model filter
if selected_provider != 'All':
    models = ['All'] + sorted(df[df['provider'] == selected_provider]['model_used'].dropna().unique().tolist())
else:
    models = ['All'] + sorted(df['model_used'].dropna().unique().tolist())
selected_model = st.sidebar.selectbox("Model", models)

# Structured output filter
structured_options = {
    'All': None,
    'Structured Only': True,
    'Non-Structured Only': False
}
selected_structured = st.sidebar.selectbox("Output Type", list(structured_options.keys()))

# Date range filter
min_date = df['created_at'].min().date()
max_date = df['created_at'].max().date()

date_range = st.sidebar.date_input(
    "Date Range",
    value=(min_date, max_date),
    min_value=min_date,
    max_value=max_date
)

# Apply filters
filtered_df = df.copy()

if selected_provider != 'All':
    filtered_df = filtered_df[filtered_df['provider'] == selected_provider]

if selected_model != 'All':
    filtered_df = filtered_df[filtered_df['model_used'] == selected_model]

if structured_options[selected_structured] is not None:
    filtered_df = filtered_df[filtered_df['is_structured_output'] == structured_options[selected_structured]]

if len(date_range) == 2:
    start_date, end_date = date_range
    filtered_df = filtered_df[
        (filtered_df['created_at'].dt.date >= start_date) &
        (filtered_df['created_at'].dt.date <= end_date)
    ]

# Summary metrics
st.header("📊 Summary Statistics")

col1, col2, col3, col4, col5 = st.columns(5)

total_requests = len(filtered_df)
total_cost = filtered_df['cost'].sum() if 'cost' in filtered_df.columns else 0
avg_cost = filtered_df['cost'].mean() if 'cost' in filtered_df.columns else 0
total_tokens = filtered_df['total_tokens'].sum() if 'total_tokens' in filtered_df.columns else 0
avg_tokens = filtered_df['total_tokens'].mean() if 'total_tokens' in filtered_df.columns else 0

col1.metric("Total Requests", f"{total_requests:,}")
col2.metric("Total Cost", f"${total_cost:.4f}")
col3.metric("Avg Cost/Request", f"${avg_cost:.4f}")
col4.metric("Total Tokens", f"{total_tokens:,.0f}")
col5.metric("Avg Tokens/Request", f"{avg_tokens:,.0f}")

st.markdown("---")

# Charts
tab1, tab2, tab3, tab4, tab5 = st.tabs([
    "📈 Cost Over Time", 
    "🥧 Cost Breakdown", 
    "🔢 Token Usage",
    "📋 Detailed View",
    "💡 Insights"
])

with tab1:
    st.subheader("Cost Trends")
    
    # Daily cost aggregation
    daily_cost = filtered_df.copy()
    daily_cost['date'] = daily_cost['created_at'].dt.date
    daily_agg = daily_cost.groupby('date').agg({
        'cost': 'sum',
        'id': 'count'
    }).reset_index()
    daily_agg.columns = ['date', 'total_cost', 'request_count']
    
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=daily_agg['date'],
        y=daily_agg['total_cost'],
        mode='lines+markers',
        name='Daily Cost',
        line=dict(color='#1f77b4', width=2),
        marker=dict(size=6)
    ))
    fig.update_layout(
        title="Daily Cost Trend",
        xaxis_title="Date",
        yaxis_title="Cost ($)",
        hovermode='x unified',
        height=400
    )
    st.plotly_chart(fig, use_container_width=True)
    
    # Cumulative cost
    daily_agg['cumulative_cost'] = daily_agg['total_cost'].cumsum()
    
    fig2 = go.Figure()
    fig2.add_trace(go.Scatter(
        x=daily_agg['date'],
        y=daily_agg['cumulative_cost'],
        mode='lines',
        name='Cumulative Cost',
        fill='tozeroy',
        line=dict(color='#2ca02c', width=2)
    ))
    fig2.update_layout(
        title="Cumulative Cost",
        xaxis_title="Date",
        yaxis_title="Cumulative Cost ($)",
        hovermode='x unified',
        height=400
    )
    st.plotly_chart(fig2, use_container_width=True)

with tab2:
    st.subheader("Cost Distribution")
    
    col1, col2 = st.columns(2)
    
    with col1:
        # Cost by provider
        provider_cost = filtered_df.groupby('provider')['cost'].sum().reset_index()
        fig = px.pie(
            provider_cost,
            values='cost',
            names='provider',
            title='Cost by Provider',
            hole=0.4
        )
        fig.update_traces(textposition='inside', textinfo='percent+label+value')
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        # Cost by model
        model_cost = filtered_df.groupby('model_used')['cost'].sum().reset_index()
        model_cost = model_cost.sort_values('cost', ascending=False).head(10)
        fig = px.pie(
            model_cost,
            values='cost',
            names='model_used',
            title='Cost by Model (Top 10)',
            hole=0.4
        )
        fig.update_traces(textposition='inside', textinfo='percent+label')
        st.plotly_chart(fig, use_container_width=True)
    
    # Cost breakdown bar chart
    cost_breakdown = filtered_df.groupby('model_used').agg({
        'cost': 'sum',
        'id': 'count'
    }).reset_index()
    cost_breakdown.columns = ['model', 'total_cost', 'request_count']
    cost_breakdown['avg_cost'] = cost_breakdown['total_cost'] / cost_breakdown['request_count']
    cost_breakdown = cost_breakdown.sort_values('total_cost', ascending=False).head(15)
    
    fig = go.Figure(data=[
        go.Bar(name='Total Cost', x=cost_breakdown['model'], y=cost_breakdown['total_cost']),
    ])
    fig.update_layout(
        title='Total Cost by Model (Top 15)',
        xaxis_title='Model',
        yaxis_title='Cost ($)',
        height=500,
        xaxis_tickangle=-45
    )
    st.plotly_chart(fig, use_container_width=True)

with tab3:
    st.subheader("Token Usage Analysis")
    
    col1, col2 = st.columns(2)
    
    with col1:
        # Token distribution
        token_data = filtered_df[['prompt_tokens', 'completion_tokens', 'reasoning_tokens']].sum()
        fig = go.Figure(data=[go.Bar(
            x=token_data.index,
            y=token_data.values,
            marker_color=['#1f77b4', '#ff7f0e', '#2ca02c']
        )])
        fig.update_layout(
            title='Token Distribution',
            xaxis_title='Token Type',
            yaxis_title='Total Tokens',
            height=400
        )
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        # Average tokens per model
        avg_tokens = filtered_df.groupby('model_used').agg({
            'prompt_tokens': 'mean',
            'completion_tokens': 'mean',
            'total_tokens': 'mean'
        }).reset_index().sort_values('total_tokens', ascending=False).head(10)
        
        fig = go.Figure()
        fig.add_trace(go.Bar(name='Prompt', x=avg_tokens['model_used'], y=avg_tokens['prompt_tokens']))
        fig.add_trace(go.Bar(name='Completion', x=avg_tokens['model_used'], y=avg_tokens['completion_tokens']))
        fig.update_layout(
            title='Avg Tokens per Model (Top 10)',
            xaxis_title='Model',
            yaxis_title='Average Tokens',
            barmode='stack',
            height=400,
            xaxis_tickangle=-45
        )
        st.plotly_chart(fig, use_container_width=True)
    
    # Token usage over time
    daily_tokens = filtered_df.copy()
    daily_tokens['date'] = daily_tokens['created_at'].dt.date
    daily_token_agg = daily_tokens.groupby('date').agg({
        'prompt_tokens': 'sum',
        'completion_tokens': 'sum',
        'total_tokens': 'sum'
    }).reset_index()
    
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=daily_token_agg['date'], y=daily_token_agg['prompt_tokens'],
                             mode='lines', name='Prompt Tokens', stackgroup='one'))
    fig.add_trace(go.Scatter(x=daily_token_agg['date'], y=daily_token_agg['completion_tokens'],
                             mode='lines', name='Completion Tokens', stackgroup='one'))
    fig.update_layout(
        title='Token Usage Over Time',
        xaxis_title='Date',
        yaxis_title='Tokens',
        hovermode='x unified',
        height=400
    )
    st.plotly_chart(fig, use_container_width=True)

with tab4:
    st.subheader("Detailed Data")
    
    # Display options
    show_cols = st.multiselect(
        "Select columns to display",
        options=filtered_df.columns.tolist(),
        default=['created_at', 'provider', 'model_used', 'cost', 'total_tokens', 'is_structured_output']
    )
    
    if show_cols:
        display_df = filtered_df[show_cols].copy()
        display_df = display_df.sort_values('created_at', ascending=False)
        
        st.dataframe(
            display_df,
            use_container_width=True,
            height=400
        )
        
        # Download button
        csv = display_df.to_csv(index=False)
        st.download_button(
            label="📥 Download CSV",
            data=csv,
            file_name=f"ai_costs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
            mime="text/csv"
        )

with tab5:
    st.subheader("💡 Insights & Recommendations")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("### Most Expensive Models")
        expensive_models = filtered_df.groupby('model_used').agg({
            'cost': ['sum', 'mean', 'count']
        }).reset_index()
        expensive_models.columns = ['model', 'total_cost', 'avg_cost', 'count']
        expensive_models = expensive_models.sort_values('total_cost', ascending=False).head(5)
        
        for idx, row in expensive_models.iterrows():
            st.markdown(f"""
            **{row['model']}**
            - Total: ${row['total_cost']:.4f}
            - Average: ${row['avg_cost']:.4f}
            - Requests: {row['count']:.0f}
            """)
    
    with col2:
        st.markdown("### Most Efficient Models (by cost/token)")
        efficiency = filtered_df[filtered_df['total_tokens'] > 0].copy()
        efficiency['cost_per_token'] = efficiency['cost'] / efficiency['total_tokens']
        efficient_models = efficiency.groupby('model_used').agg({
            'cost_per_token': 'mean',
            'cost': 'sum',
            'id': 'count'
        }).reset_index()
        efficient_models.columns = ['model', 'cost_per_token', 'total_cost', 'count']
        efficient_models = efficient_models.sort_values('cost_per_token').head(5)
        
        for idx, row in efficient_models.iterrows():
            st.markdown(f"""
            **{row['model']}**
            - Cost/Token: ${row['cost_per_token']:.6f}
            - Total: ${row['total_cost']:.4f}
            - Requests: {row['count']:.0f}
            """)
    
    # Structured vs Non-Structured
    st.markdown("### Structured vs Non-Structured Output")
    structured_comparison = filtered_df.groupby('is_structured_output').agg({
        'cost': ['sum', 'mean', 'count']
    }).reset_index()
    
    if not structured_comparison.empty:
        structured_comparison.columns = ['structured', 'total_cost', 'avg_cost', 'count']
        
        col1, col2 = st.columns(2)
        
        for idx, row in structured_comparison.iterrows():
            output_type = "Structured" if row['structured'] else "Non-Structured"
            with col1 if row['structured'] else col2:
                st.metric(f"{output_type} Requests", f"{row['count']:.0f}")
                st.metric(f"{output_type} Total Cost", f"${row['total_cost']:.4f}")
                st.metric(f"{output_type} Avg Cost", f"${row['avg_cost']:.4f}")

# Footer
st.markdown("---")
st.markdown(f"*Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | Total records: {len(df):,}*")

# Refresh button
if st.sidebar.button("🔄 Refresh Data"):
    st.cache_data.clear()
    st.rerun()