var REG_TYPE_MEASURE			=	130;	// Тип измерения
var REG_TYPE_CASE				=	131;	// Тип корпуса
var REG_POSITION_OF_CASE		=	132;	// Позиция
var REG_TYPE_SIGNAL_CTRL		=	133;	// Тип управления
var REG_TYPE_SIGNAL_AT_LEAKAGE	=	134;	// Тип сигнала при утечке
var REG_TYPE_POLARITY			=	135;	// Полярность подключения

//----------------------------------------------------------------------------------
function ECMultiplexerInfo()
{
	print("Status = "+dev.r(192));
	print("Fault = "+dev.r(193));
	print("Desable reason = "+dev.r(194));
	print("Problem = "+dev.r(196));
	print("Result last command operate = "+dev.r(197));
	print("State button START = "+dev.r(199));
}
//----------------------------------------------------------------------------------
// Измерение тока утечки
function ECMultiplexerMeas_Leak(Case, Position, SignalCtrl, SignalLeak, Polarity)
{
	dev.w(REG_TYPE_MEASURE, 1);
	dev.w(REG_TYPE_CASE, Case);
	dev.w(REG_POSITION_OF_CASE, Position);
	dev.w(REG_TYPE_SIGNAL_CTRL, SignalCtrl);
	dev.w(REG_TYPE_SIGNAL_AT_LEAKAGE, SignalLeak);
	dev.w(REG_TYPE_POLARITY, Polarity);
	
	dev.c(20);
	
	sleep(500);
	
	p("Result: " + dev.r(197));
	p("Table is: " + dev.r(200));
}
//----------------------------------------------------------------------------------

// Измерение падения на нагрузке
function ECMultiplexerMeas_Drop(Case, Position, SignalCtrl, Polarity)
{
	dev.w(REG_TYPE_MEASURE, 2);
	dev.w(REG_TYPE_CASE, Case);
	dev.w(REG_POSITION_OF_CASE, Position);
	dev.w(REG_TYPE_SIGNAL_CTRL, SignalCtrl);
	dev.w(REG_TYPE_POLARITY, Polarity);
	
	dev.c(20);
	
	sleep(500);
	
	p("Result: " + dev.r(197));
	p("Table is: " + dev.r(200));
}
//----------------------------------------------------------------------------------

// Измерение входного напряжения
function ECMultiplexerMeas_Input(Case, Position, SignalCtrl)
{
	dev.w(REG_TYPE_MEASURE, 3);
	dev.w(REG_TYPE_CASE, Case);
	dev.w(REG_POSITION_OF_CASE, Position);
	dev.w(REG_TYPE_SIGNAL_CTRL, SignalCtrl);
	
	dev.c(20);
	
	sleep(500);
	
	p("Result: " + dev.r(197));
	p("Table is: " + dev.r(200));
}

// Измерение напряжения запрета
function ECMultiplexerMeas_Ban(Case, Position, SignalCtrl, Polarity)
{
	dev.w(REG_TYPE_MEASURE, 4);
	dev.w(REG_TYPE_CASE, Case);
	dev.w(REG_POSITION_OF_CASE, Position);
	dev.w(REG_TYPE_SIGNAL_CTRL, SignalCtrl);
	dev.w(REG_TYPE_POLARITY, Polarity);
	
	dev.c(20);
	
	sleep(500);
	
	p("Result: " + dev.r(197));
	p("Table is: " + dev.r(200));
}